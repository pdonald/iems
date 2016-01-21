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
        accessKeyId: 'xx',
        secretAccessKey: 'xx',
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

    this.data = {
      id: 'awsec2',
      name: 'AWS EC2',
      title: 'Amazon Web Services (AWS) Elastic Cloud Compute (EC2)',
      configs: this.configs,
      instances: {},
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

    // describe instances 5 minutes, every 10 sec after launch for 5 minutes
    // ssh every 1 minute
  }

  getData() {
    return this.data
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
    };

    aws.ec2.runInstances(params, (err, data) => {
      if (err) return cb(err);

      let instanceId = data.Instances[0].InstanceId;
      let instanceInfo = { status: 'launched', configId: config.id }

      aws.instances[instanceId] = instanceInfo

      params = {
        Resources: [instanceId],
        Tags: [
          { Key: 'Name', Value: 'iEMS #' + config.id + ': ' + config.name },
          { Key: 'iems', Value: 'true' },
          { Key: 'iems-config', Value: config.id },
        ]
      };

      aws.ec2.createTags(params, (err) => {
        if (err) {
          instanceInfo.status = 'error';
          instanceInfo.error = err;
          return;
        }

        instanceInfo.status = 'launched-tagged';
      });
    });
  }

  terminate() {

  }

  status(cb) {
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
              aws.instances[id] = {
                status: 'launched-tagged',
                configId: instance.Tags.filter(t => t.Key == 'iems-config').map(t => t.Value)[0]
              }
            }

            aws.instances[id].lastUpdated = new Date().toString()
            aws.instances[id].details = instance

            if (instance.State.Name == 'running') {
              let prevStatus = aws.instances[id].status
              aws.instances[id].status = 'running'

              if (prevStatus != 'running') {
                console.log('connecting now...')
                let config = this.configs[aws.instances[id].configId]
                let ssh = new SshClient()
                ssh.on('ready', () => {
                  console.log('connected')
                  aws.instances[id].ssh = ssh
                  if (config.sshScript) {
                    console.log('executing SSH script')
                    sshexec(ssh, config.sshScript, (err, code, stdout, stderr) => {
                      if (err) throw err;
                      console.log('SSH exit: ' + code)
                      if (stdout) console.log('SSH stdout: ' + stdout.trim())
                      if (stderr) console.log('SSH stderr: '+  stderr.trim())
                    })
                  }

                  setInterval(() => {
                    sshexec(ssh, 'uptime', (err, code, stdout) => {
                      if (err) throw err;
                      console.log(stdout.trim())
                    })
                  }, 1000)
                })
                ssh.connect({
                  host: instance.PublicIpAddress,
                  port: config.sshPort || 22,
                  username: config.sshUsername || 'ubuntu',
                  privateKey: config.sshPrivateKey
                })
              }
            }
          }
        }
        //console.log(aws.instances)
      })
    }

    cb(null, ':)')
  }
}

exports.AwsEc2 = AwsEc2

let configs = {
  'testconf1': {
    id: 'testconf1',
    name: 'AWS EC2 Micro 1GB/1vCPU',
    provider: 'aws-ec2',
    accessKeyId: 'AKIAIUF3Z6TBM7PW4GAQ',
    secretAccessKey: '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',
    region: 'eu-west-1a',
    instanceType: 't1.micro',
    imageId: 'ami-5da23a2a',
    sshPort: 22,
    sshUsername: 'ubuntu',
    sshPrivateKey: require('fs').readFileSync('c:\\users\\peteris\\downloads\\iems-test.pem')
  }
}

//let provider = new AwsEc2(configs)

//provider.launch(configs['testconf1'])

/*
setInterval(() => {
  provider.status((err, status) => {
    if (err) throw err;
    //console.log(status);
  });
}, 1000);

*/
