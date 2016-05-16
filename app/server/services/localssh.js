let SshConnection = require('../ssh').Connection

class Localssh {
  constructor() {
    this.instances = {}
  }

  launch(config) {
    let id = config.id + '-' + Math.round(Math.random()*1000)
    let instance = new Instance(config, id)
    this.instances[instance.id] = instance
    instance.launch()
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

  toJSON() {
    return {
      id: 'localssh',
      name: 'Local SSH',
      title: 'Local SSH connections',
      info: {
        installed: true,
        version: require('ssh2/package.json').version
      },
      instances: Object.keys(this.instances).map(key => this.instances[key]),
      ui: {
        configs: {
          columns: {
            name: { title: 'Name' },
            sshHost: { title: 'Host' },
            sshPort: { title: 'Port' },
            sshUsername: { title: 'User' },
          },
          form: {
            name: { label: 'Name' },
            service: { hidden: true, value: 'localssh' },
            sshHost: { label: 'Host' },
            sshPort: { label: 'Port' },
            sshUsername: { label: 'Username' },
            sshPassword: { label: 'Password', secret: true },
            sshPrivateKey: { label: 'Private key' },
            sshScript: { label: 'SSH Script', rows: 10 },
          }
        }
      }
    }
  }
}

class Instance {
  constructor(config, id) {
    this.id = id
    this.config = config
    this.ssh = null
  }

  launch() {
    this.state = 'launching'
    this.connect()
  }

  connect() {
    this.state = 'running'

    let sshconfig = {
      host: this.config.sshHost,
      port: this.config.sshPort,
      username: this.config.sshUsername,
      password: this.config.sshPassword,
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
    this.state = 'terminated'
    this.disconnect()
  }

  exec(cmd, cb) {
    if (this.ssh) {
      this.ssh.exec(cmd, cb)
    }
  }

  toJSON() {
    return {
      id: this.id,
      service: 'localssh',
      state: this.state,
      config: this.config,
      stats: this.ssh ? this.ssh.stats : null
    }
  }
}

exports.Localssh = Localssh
