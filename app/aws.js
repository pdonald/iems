"use strict";

let SshClient = require('ssh2').Client;

function sshexec(ssh, cmd, cb) {
  ssh.exec(cmd, (err, stream) => {
    if (err) return cb(err)
    let stdout = ''
    let stderr = ''
    stream.on('close', (code, signal) => cb(null, code, stdout, stderr))
    stream.on('data', data => stdout += data)
    stream.stderr.on('data', data => stderr += data)
  })
}

class AwsEc2 {
  constructor() {
    this.configs = {
      'testconf1': {
        id: 'testconf1',
        service: 'awsec2',
        name: 'AWS EC2 Micro 1GB/1vCPU',
        accessKeyId: 'AKIAIUF3Z6TBM7PW4GAQ',
        secretAccessKey: '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',
        region: 'eu-west-1b',
        instanceType: 't1.micro',
        imageId: 'ami-5da23a2a',
        sshPort: 22,
        sshUsername: 'ubuntu',
        sshPrivateKey: require('fs').readFileSync('c:\\users\\peteris\\downloads\\iems-test.pem').toString(),
        sshScript: 'touch /home/ubuntu/i-was-here && echo I am in!'
      },
    }

    this.aws = []

    this.setup(this.configs)

    this.data = {
      id: 'awsec2',
      name: 'AWS EC2',
      title: 'Amazon Web Services (AWS) Elastic Cloud Compute (EC2)',
      configs: this.configs,
      ui: {
        configs: {
          columns: {
            name: { title: 'Name' },
            region: { title: 'Region' },
            instanceType: { title: 'Instance type' }
          },
          form: {
            name: { label: 'Name' },
            service: { hidden: true, value: 'awsec2' },
            accessKeyId: { label: 'Access Key' },
            secretAccessKey: { secret: true, label: 'Secret Access Key' },
            region: { options: { 'eu-west-1': { title: 'EU West (Ireland)', options: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'] },
                                'us-east-1': { title: 'US East (N. Virginia)', options: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e'] } },
                      label: 'Region' },
            instanceType: { options: ['t1.micro', 'r2.large'], label: 'Instance Type' },
            imageId: { defaultValue: 'ami-5da23a2a', label: 'Image ID' },
            sshPort: { defaultValue: 22, label: 'SSH Port' },
            sshUsername: { defaultValue: 'ubuntu', label: 'SSH Username' },
            sshPrivateKey: { label: 'SSH Private Key', secret: true },
            sshScript: { label: 'SSH Script', rows: 10 },
          }
        }
      }
    }

    setInterval(() => this.refresh(), 1000)
  }

  getData() {
    let data = Object.assign({}, {}, this.data)
    data.instances = []
    for (let hash in this.aws) {
      let aws = this.aws[hash]
      for (let i in aws.instances) {
        data.instances.push(aws.instances[i].toJSON())
      }
    }
    return data
  }

  setup(configs) {
    for (let id in this.configs) {
      let config = this.configs[id]
      if (config.service == 'awsec2') {
        let region = config.region.substr(0, config.region.length - 1)
        let hash = [region, config.accessKeyId, config.secretAccessKey].join('/')

        if (!this.aws[hash]) {
          let AWS = require('aws-sdk')
          AWS.config.update({ region: region, accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey })
          this.aws[hash] = {
            ec2: new AWS.EC2(),
            instances: {}
          }
        }
      }
    }
  }

  launch(config, cb) {
    this.setup(this.configs)

    let region = config.region.substr(0, config.region.length - 1)
    let hash = [region, config.accessKeyId, config.secretAccessKey].join('/')
    let aws = this.aws[hash]

    if (!aws) {
      throw 'Unknown access point'
    }

    let params = {
      ImageId: config.imageId,
      InstanceType: config.instanceType,
      MinCount: 1, MaxCount: 1,
      Placement: { AvailabilityZone: config.region },
      KeyName: 'iEMS-test'
    }

    aws.ec2.runInstances(params, (err, data) => {
      if (err) return cb(err)

      let instanceId = data.Instances[0].InstanceId;
      let instanceInfo = new Instance()
      instanceInfo.state = 'launched'
      instanceInfo.config = config

      aws.instances[instanceId] = instanceInfo

      params = {
        Resources: [instanceId],
        Tags: [
          { Key: 'Name', Value: 'iEMS #' + config.id + ': ' + config.name },
          { Key: 'iems', Value: 'true' },
          { Key: 'iems-config', Value: config.id },
        ]
      }

      aws.ec2.createTags(params, (err) => {
        if (err) {
          instanceInfo.state = 'error'
          instanceInfo.error = err
          return;
        }

        instanceInfo.state = 'launched-tagged'
      })
    })
  }

  terminate() {

  }

  refresh() {
    for (let key in this.aws) {
      let aws = this.aws[key]

      let params = { Filters: [ { Name: 'tag:iems', Values: [ 'true' ] } ] }

      aws.ec2.describeInstances(params, (err, data) => {
        if (err) throw err;
        // todo: check timestamp
        for (let reservation of data.Reservations) {
          for (let instance of reservation.Instances) {
            let id = instance.InstanceId

            if (!aws.instances[id]) {
              let configId = instance.Tags.filter(t => t.Key == 'iems-config').map(t => t.Value)[0]
              let config = this.configs[configId]

              if (!config) {
                console.error('Unknown config:', config)
              }

              aws.instances[id] = new Instance()
              aws.instances[id].state = 'launched-tagged'
              aws.instances[id].config = config
            }

            aws.instances[id].update(instance, new Date())
          }
        }
        //console.log(aws.instances)
      })
    }
  }
}

// updates every 30sec from describeInstances()
// on connect => get specs
// update load/disk/mem every 20s
class Instance {
  constructor() {
    this.state = null
    this.instance = null
    this.instanceLastUpdated = null
    this.config = null
    this.ssh = null

    this.stats = {
      // launchuptime (date, time since launch)
      // cost (how much $$ so far)
      lastUpdated: null,

      uptime: {
        boot: null,
        launch: null
      },

      cpu: {
        cores: null,
        model: null,
        load: null
      },

      memory: {
        ram: null,
        swap: null,
        disk: null
      }
    }
  }

  update(instance, date) {
    this.instanceLastUpdated = date.toString()
    this.instance = instance

    if (instance.State.Name == 'running') {
      let prevState = this.state
      this.state = 'running'

      if (prevState != 'running') {
        this.connect()
      }
    }
  }

  connect() {
    console.log('connecting now...')

    let ssh = new SshClient()

    ssh.once('ready', () => {
      console.log('connected')
      this.ssh = ssh

      this.refreshStatsTimer = setInterval(() => this.refreshStats(), 30 * 1000)
      this.refreshStats()

      this.provision()

      setInterval(() => {
        sshexec(this.ssh, 'uptime', (err, code, stdout) => {
          if (err) throw err;
          console.log(stdout.trim())
        })
      }, 1000)
    })

    ssh.connect({
      host: this.instance.PublicIpAddress,
      port: this.config.sshPort || 22,
      username: this.config.sshUsername || 'ubuntu',
      privateKey: this.config.sshPrivateKey,

      readyTimeout: 2 * 60 * 1000,
      keepaliveInterval: 20 * 1000,
      keepaliveCountMax: 3
    })
  }

  disconnect() {
    if (this.refreshStatsTimer) {
      clearInterval(this.refreshStatsTimer)
      this.refreshStatsTimer = null
    }

    if (this.ssh) {
      this.ssh.end()
      this.ssh = null
    }
  }

  reconnect() {
    this.disconnect()
    this.connect()
  }

  provision() {
    if (this.config.sshScript) {
      console.log('executing SSH script')
      sshexec(this.ssh, this.config.sshScript, (err, code, stdout, stderr) => {
        if (err) throw err;
        console.log('SSH exit: ' + code)
        if (stdout) console.log('SSH stdout: ' + stdout.trim())
        if (stderr) console.log('SSH stderr: '+  stderr.trim())
      })
    }
  }

  refreshStats() {
    let cmds = {
      'cat /proc/uptime': (stdout) => {
        this.stats.uptime.boot = parseInt(stdout.trim().split(/\s+/)[0])
      },
      'nproc': (stdout) => {
        this.stats.cpu.cores = parseInt(stdout.trim())
      },
      'cat /proc/loadavg': (stdout) => {
        //  0.00 0.01 0.05 2/66 4307
        this.stats.cpu.load = stdout.trim().split(' ').slice(0, 3).map(n => parseFloat(n))
      },
      'cat /proc/cpuinfo': (stdout) => {
        // processor       : 0
        // model name      : Intel(R) Xeon(R) CPU E5-2650 0 @ 2.00GHz
        this.stats.cpu.model = stdout
          .trim().split('\n')
          .map(line => line.split(':'))
          .filter(arr => arr.length == 2)
          .map(arr => [arr[0].trim(), arr[1].trim()])
          .filter(arr => arr[0] == 'model name')[0][1]
      },
      'free -bo': (stdout) => {
        //              total       used       free     shared    buffers     cached
        // Mem:     617156608  253972480  363184128     212992    9023488  200650752
        // Swap:            0          0          0
        let lines = stdout.trim().split('\n')
        let mem = lines[1].split(/\s+/)
        let swap = lines[2].split(/\s+/)
        this.stats.memory.ram = { total: parseInt(mem[1]), used: parseInt(mem[2]), free: parseInt(mem[3]) }
        this.stats.memory.swap = { total: parseInt(swap[1]), used: parseInt(swap[2]), free: parseInt(swap[3]) }
      },
      'df -B1 -x tmpfs -x devtmpfs --total --local': (stdout) => {
        // Filesystem      1B-blocks      Used  Available Use% Mounted on
        // /dev/xvda1     8320901120 812576768 7062052864  11% /
        // total          8320901120 812576768 7062052864  11% -
        let total = stdout.trim().split('\n').pop().split(/\s+/)
        this.stats.memory.disk = { total: parseInt(total[1]), used: parseInt(total[2]), free: parseInt(total[3]) }
      }
    }

    let cmd = Object.keys(cmds).join(' && echo === && ')
    sshexec(this.ssh, cmd, (err, code, stdout) => {
      if (err) throw err
      if (code != 0) throw 'Exit code: ' + code
      let parsers = Object.keys(cmds).map(k => cmds[k])
      stdout.split('===\n').forEach((output, index) => parsers[index](output))
      this.stats.lastUpdated = new Date().toString()
      console.log(this.stats)
    })
  }

  toJSON() {
    return {
      instance: this.instance,
      config: this.config,
      stats: this.stats
    }
  }
}

exports.AwsEc2 = AwsEc2
