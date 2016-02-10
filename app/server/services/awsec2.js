"use strict"

let fs = require('fs')
let crypto = require('crypto')
let request = require('request')
let AWS = require('aws-sdk')

let SshConnection = require('../ssh').Connection

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex')
}

class AwsEc2 {
  constructor() {
    this.aws = []
    this.configs = {}
    this.instances = {}
    this.version = require('aws-sdk/package.json').description + ' ' + require('aws-sdk/package.json').version

    setInterval(() => this.refresh(), 1000)
  }

  configHash(config) {
    let region = config.region ? config.region.substr(0, config.region.length - 1) : ''
    let hash = [region, (config.accessKeyId || '').substr(0, 5), md5(config.secretAccessKey || '').substr(0, 5)].join('-')
    return hash
  }

  connect(configs) { // todo: handle changes
    for (let id in configs) {
      let config = configs[id]

      if (config.service == 'awsec2') {
        let hash = this.configHash(config)

        if (!this.aws[hash]) {
          let region = config.region ? config.region.substr(0, config.region.length - 1) : null
          let aws = this.aws[hash] = {
            ec2: new AWS.EC2({ region: region, accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }),
            keyName: `iEMS-${hash}`,
            keyData: null,
            keyFilename: `${__dirname}/../../../build/awsec2/iems-${hash}.pem`, // todo
            securityGroup: `iEMS-${hash}`,
            failures: 0
          }

          if (config.accessKeyId && config.secretAccessKey) {
            if (!fs.existsSync(aws.keyFilename)) {
              let params = { KeyName: aws.keyName }
              aws.ec2.deleteKeyPair(params, (err, data) => {
                aws.ec2.createKeyPair(params, (err, data) => {
                  if (err) return console.error(err)
                  fs.writeFileSync(aws.keyFilename, data.KeyMaterial)
                })
              })
            } else {
              aws.keyData = fs.readFileSync(aws.keyFilename) // todo: file exists but kp doesn't
            }

            aws.ec2.createSecurityGroup({ GroupName: aws.securityGroup, Description: 'iEMS' }, (err, data) => {
              request('https://api.ipify.org/', (err, resp, body) => {
                if (err) return console.error(err)
                let params = {
                  GroupName: aws.securityGroup,
                  FromPort: 22, // todo: move into launch
                  ToPort: 22,
                  CidrIp: body + '/32',
                  IpProtocol: 'tcp'
                }
                aws.ec2.authorizeSecurityGroupIngress(params, (err, data) => {
                  if (err && err.code == 'InvalidPermission.Duplicate') return
                  if (err) console.error(err)
                })
              })
            })
          }
        } else {
          this.aws[hash].failures = 0
        }

        this.configs[id] = config
      }
    }
  }

  launch(config) {
    this.connect({ [config.id]: config })

    let hash = this.configHash(config)
    let aws = this.aws[hash]

    if (!aws) {
      throw 'Unknown access point'
    }

    let id = config.id + '-' + Math.round(Math.random()*1000)
    let instance = new Instance(aws, id, config)
    instance.launch()
    this.instances[id] = instance
  }

  terminate(id) {
    if (this.instances[id]) {
      this.instances[id].terminate()
    }
  }

  exec(id, cmd, cb) {
    if (this.instances[id]) {
      this.instances[id].exec(cmd, cb)
    }
  }

  refresh() {
    let params = { Filters: [ { Name: 'tag:iems', Values: [ 'true' ] } ] }

    for (let key in this.aws) {
      let aws = this.aws[key]

      if (aws.failures > 5) {
        continue
      }

      aws.ec2.describeInstances(params, (err, data) => {
        if (err) {
          console.error(err.message)
          aws.failures++
          return
        }

        aws.failures = 0

        // todo: check timestamp

        for (let reservation of data.Reservations) {
          for (let instance of reservation.Instances) {
            let id = instance.Tags.filter(t => t.Key == 'iems-id').map(t => t.Value)[0]

            if (!id) {
              continue
            }

            if (!this.instances[id]) {
              let configId = instance.Tags.filter(t => t.Key == 'iems-config').map(t => t.Value)[0]
              let config = this.configs[configId]

              if (!config) {
                console.error('Unknown config:', config)
              }

              this.instances[id] = new Instance(aws, id, config)
            }

            this.instances[id].update(instance, new Date())
          }
        }
      })

      aws.ec2.describeSpotInstanceRequests(params, (err, data) => {
        if (err) {
          console.error(err.message)
          aws.failures++
          return
        }

        aws.failures = 0

        for (let request of data.SpotInstanceRequests) {
          let id = request.Tags.filter(t => t.Key == 'iems-id').map(t => t.Value)[0]

          if (!id) {
            continue
          }

          if (!this.instances[id]) {
            let configId = request.Tags.filter(t => t.Key == 'iems-config').map(t => t.Value)[0]
            let config = this.configs[configId]

            if (!config) {
              console.error('Unknown config:', config)
            }

            this.instances[id] = new Instance(aws, id, config)
          }

          this.instances[id].updateSpot(request)
        }
      })
    }
  }

  toJSON() {
    let configs = {}
    for (let id in this.configs) {
      let config = Object.assign({}, this.configs[id])
      config.secretAccessKey = ''
      configs[id] = config
    }

    return {
      id: 'awsec2',
      name: 'AWS EC2',
      title: 'Amazon Web Services (AWS) Elastic Cloud Compute (EC2)',
      instances: Object.keys(this.instances).map(key => this.instances[key].toJSON()),
      info: {
        installed: true,
        version: this.version
      },
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
            spotPrice: { label: 'Spot price', min: 0.00, max: 10 },
            region: { label: 'Region',
                      options: { 'eu-west-1': { title: 'EU West (Ireland)', options: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'] },
                                 'us-east-1': { title: 'US East (N. Virginia)', options: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e'] } } },
            instanceType: { options: ['t1.micro', 'r2.large'], label: 'Instance Type' },
            imageId: { defaultValue: 'ami-5da23a2a', label: 'Image ID' },
            sshPort: { defaultValue: 22, label: 'SSH Port' },
            sshUsername: { defaultValue: 'ubuntu', label: 'SSH Username' },
            sshScript: { label: 'SSH Script', rows: 10 },
          }
        }
      }
    }
  }
}

class Instance {
  constructor(aws, id, config) {
    this.id = id
    this.aws = aws
    this.state = null
    this.spotRequest = null
    this.instance = null
    this.instanceLastUpdated = null
    this.config = config
    this.logs = []
    this.error = null
  }

  launch() {
    if (this.config.spotPrice) {
      this.launchSpot()
      return
    }

    this.state = 'launching'

    let params = {
      ImageId: this.config.imageId,
      InstanceType: this.config.instanceType,
      MinCount: 1, MaxCount: 1,
      Placement: { AvailabilityZone: this.config.region },
      KeyName: this.aws.keyName,
      SecurityGroups: [this.aws.securityGroup]
    }

    this.aws.ec2.runInstances(params, (err, data) => {
      if (err) {
        this.state = 'error'
        this.error = err
        console.error(err)
        return
      }

      this.state = 'launched'

      this.tagid(data.Instances[0].InstanceId)
    })
  }

  launchSpot() {
    this.state = 'spot-requesting'

    let params = {
      LaunchSpecification: {
        ImageId: this.config.imageId,
        InstanceType: this.config.instanceType,
        Placement: { AvailabilityZone: this.config.region },
        KeyName: this.aws.keyName,
        SecurityGroups: [this.aws.securityGroup]
      },
      InstanceCount: 1,
      SpotPrice: this.config.spotPrice,
      Type: 'one-time'
    }

    this.aws.ec2.requestSpotInstances(params, (err, data) => {
      if (err) {
        this.state = 'error'
        this.error = err
        return
      }

      this.spotRequest = data.SpotInstanceRequests[0]
      this.state = 'spot-requested'

      this.tagid(this.spotRequest.SpotInstanceRequestId)
    })
  }

  update(instance, date) {
    this.instanceLastUpdated = date.toString()
    this.instance = instance

    let prevState = this.state
    this.state = instance.State.Name

    if (prevState != this.state) {
      //this.log({ type: 'state-change', from: prevState, to: this.state, date: date })
    }

    if (this.state == 'running' && !this.ssh) {
      this.connect()
    } else if (prevState == 'running' && this.state != 'running') {
      this.disconnect()
    }
  }

  updateSpot(request) {
    this.spotRequest = request

    if (!this.instance) {
      this.state = 'spot-' + this.spotRequest.State

      if (this.spotRequest.State == 'active' && this.spotRequest.InstanceId) {
        this.tagid(this.spotRequest.InstanceId)
      }
    }
  }

  connect() {
    let sshconfig = {
      host: this.instance.PublicIpAddress,
      port: this.config.sshPort || 22,
      username: this.config.sshUsername || 'ubuntu',
      privateKey: this.aws.keyData,
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
    if (this.spotRequest) {
      this.log({ tag: 'aws', msg: 'canceling-spot' })
      let params = { SpotInstanceRequestIds: [ this.spotRequest.SpotInstanceRequestId ] }
      this.aws.ec2.cancelSpotInstanceRequests(params, (err, data) => {
        if (err) return this.log({ tag: 'aws', msg: 'error', error: err })
        this.log({ tag: 'aws', msg: 'canceled-spot' })
      })
    }

    if (this.instance) {
      this.log({ tag: 'aws', msg: 'terminating' })
      this.aws.ec2.terminateInstances({ InstanceIds: [this.instance.InstanceId] }, (err, data) => {
        if (err) return this.log({ tag: 'aws', msg: 'error', error: err })
        this.log({ tag: 'aws', msg: 'terminated' })
      })
    }
  }

  exec(cmd, cb) {
    if (this.ssh) {
      this.ssh.exec(cmd, cb)
    }
  }

  tag(name, value, cb) {
    let tag = { Resources: [this.instance.InstanceId], Tags: [ { Key: name, Value: value } ] }
    this.aws.ec2.createTags(tag, err => {
      if (err) return this.log({ tag: 'aws-tag', msg: 'error', error: err })
      cb && cb(name, value)
    })
  }

  tagid(id) {
    let params = {
      Resources: [id],
      Tags: [
        { Key: 'Name', Value: 'iEMS #' + this.config.id + ': ' + this.config.name },
        { Key: 'iems', Value: 'true' },
        { Key: 'iems-config', Value: this.config.id },
        { Key: 'iems-id', Value: this.id },
      ]
    }

    this.aws.ec2.createTags(params, (err) => {
      if (err) {
        this.state = 'error'
        this.error = err
        return
      }
    })
  }

  log(msg) {
    msg.date = new Date().toString()
    this.logs.push(msg)
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
