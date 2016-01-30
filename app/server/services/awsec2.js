"use strict"

let crypto = require('crypto')

let SshConnection = require('../ssh').Connection

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex')
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

class AwsEc2 {
  constructor() {
    this.configs = {}
    this.aws = []

    setInterval(() => this.refresh(), 1000)
  }

  connect(configs) {
    for (let id in configs) {
      let config = configs[id]

      if (config.service == 'awsec2') {
        let region = config.region.substr(0, config.region.length - 1)
        let hash = [region, config.accessKeyId, md5(config.secretAccessKey)].join('/')

        if (!this.aws[hash]) {
          let AWS = require('aws-sdk') // todo: check multiple regions
          AWS.config.update({ region: region, accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey })
          this.aws[hash] = {
            ec2: new AWS.EC2(),
            instances: {}
          }
        }

        this.configs[id] = config
      }
    }
  }

  launch(config) {
    this.connect({ [config.id]: config })

    let region = config.region.substr(0, config.region.length - 1)
    let hash = [region, config.accessKeyId, md5(config.secretAccessKey)].join('/')
    let aws = this.aws[hash]

    if (!aws) {
      throw 'Unknown access point'
    }

    let params = {
      ImageId: config.imageId,
      InstanceType: config.instanceType,
      MinCount: 1, MaxCount: 1,
      Placement: { AvailabilityZone: config.region },
      KeyName: 'iEMS-test' // todo
    }

    aws.ec2.runInstances(params, (err, data) => {
      if (err) throw err

      let instanceId = data.Instances[0].InstanceId;
      let instanceInfo = new Instance(aws, instanceId)
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
          return
        }

        instanceInfo.state = 'launched-tagged'
      })
    })
  }

  terminate(id) {
    for (let key in this.aws) {
      let aws = this.aws[key]
      if (aws.instances[id]) {
        aws.instances[id].terminate()
      }
    }
  }

  refresh() {
    let params = { Filters: [ { Name: 'tag:iems', Values: [ 'true' ] } ] }

    for (let key in this.aws) {
      let aws = this.aws[key]
      aws.ec2.describeInstances(params, (err, data) => {
        if (err) throw err

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

              aws.instances[id] = new Instance(aws, id)
              aws.instances[id].state = 'launched-tagged'
              aws.instances[id].config = config
            }

            aws.instances[id].update(instance, new Date())
          }
        }
      })
    }
  }

  toJSON() {
    let configs = {}
    for (let id in this.configs) {
      let config = clone(this.configs[id])
      config.secretAccessKey = ''
      configs[id] = config
    }

    let instances = []
    for (let hash in this.aws) {
      let aws = this.aws[hash]
      for (let i in aws.instances) {
        instances.push(aws.instances[i].toJSON())
      }
    }

    return {
      id: 'awsec2',
      name: 'AWS EC2',
      title: 'Amazon Web Services (AWS) Elastic Cloud Compute (EC2)',
      configs: configs,
      instances: instances,
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
            region: { label: 'Region',
                      options: { 'eu-west-1': { title: 'EU West (Ireland)', options: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'] },
                                 'us-east-1': { title: 'US East (N. Virginia)', options: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e'] } } },
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
  }
}

class Instance {
  constructor(aws, id) {
    this.id = id
    this.aws = aws
    this.state = null
    this.instance = null
    this.instanceLastUpdated = null
    this.config = null
    this.logs = []
  }

  log(msg) {
    msg.date = new Date().toString()
    this.logs.push(msg)
  }

  update(instance, date) {
    this.instanceLastUpdated = date.toString()
    this.instance = instance

    let prevState = this.state
    this.state = instance.State.Name

    if (prevState != this.state) {
      this.log({ type: 'state-change', from: prevState, to: this.state, date: date })
    }

    if (prevState != 'running' && this.state == 'running') {
      this.connect()
    } else if (prevState == 'running' && this.state != 'running') {
      this.disconnect()
    }
  }

  connect() {
    let sshconfig = {
      host: this.instance.PublicIpAddress,
      port: this.config.sshPort || 22,
      username: this.config.sshUsername || 'ubuntu',
      privateKey: this.config.sshPrivateKey,
      provision: this.config.sshScript
    }

    this.ssh = new SshConnection(sshconfig)
    this.ssh.connect()
  }

  disconnect() {
    if (this.ssh) {
      this.ssh.disconnect()
      this.ssh = null
    }
  }

  terminate() {
    this.log({ tag: 'aws', msg: 'terminating' })
    this.aws.ec2.terminateInstances({ InstanceIds: [this.id] }, (err, data) => {
      if (err) return this.log({ tag: 'aws', msg: 'error', error: err })
      this.log({ tag: 'aws', msg: 'terminated' })
    })
  }

  tag(name, value, cb) {
    let tag = { Resources: [this.instance.InstanceId], Tags: [ { Key: name, Value: value } ] }
    this.aws.ec2.createTags(tag, err => {
      if (err) return this.log({ tag: 'aws-tag', msg: 'error', error: err })
      cb && cb(name, value)
    })
  }

  toJSON() {
    return {
      id: this.id,
      service: 'awsec2',
      state: this.state,
      instance: this.instance,
      config: this.config,
      stats: this.ssh ? this.ssh.stats : null,
      logs: this.logs
    }
  }
}

exports.AwsEc2 = AwsEc2
