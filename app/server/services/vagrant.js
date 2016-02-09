"use strict"

const glob = require('glob')
const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const exec = require('child_process').exec
const rmdir = require('rimraf')

let SshConnection = require('../ssh').Connection

class Vagrant {
  constructor() {
    this.configs = {}
    this.instances = {}
    this.basedir = __dirname + '/../../../build/vagrant/'
    this.vagrantVersion = null
  }

  connect(configs) {
    for (let id in configs) {
      let config = configs[id]
      if (config.service == 'vagrant') {
        this.configs[id] = config
      }
    }
  }

  scan() {
    exec('vagrant --version', { cwd: this.dir }, (err, stdout, stderr) => {
      if (err) return console.error(err)
      if (stdout.trim()) this.vagrantVersion = stdout.trim()
    })

    glob(this.basedir + '/*/Vagrantfile', (err, files) => {
      files.map(file => path.dirname(file)).forEach(dir => {
        let dirname = path.basename(dir)
        let configid = dirname.split('-')[0]
        let config = this.configs[configid]
        if (config) {
          let id = dirname //.split('-')[1]
          let instance = new Instance(config, id, dir)
          this.instances[id] = instance
          instance.connect()
        }
      })
    })
  }

  launch(config) {
    this.connect({ [config.id]: config })

    let id = config.id + '-' + Math.round(Math.random()*1000)
    let dir = this.basedir + id

    let instance = new Instance(config, id, dir)
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
      id: 'vagrant',
      name: 'Vagrant',
      title: 'Vagrant',
      info: {
        installed: !!this.vagrantVersion,
        version: this.vagrantVersion
      },
      instances: Object.keys(this.instances).map(key => this.instances[key].toJSON()),
      ui: {
        configs: {
          columns: {
            name: { title: 'Name' },
            box: { title: 'Image' },
            memory: { title: 'Memory' },
            cores: { title: 'Cores' },
          },
          form: {
            name: { label: 'Name' },
            service: { hidden: true, value: 'vagrant' },
            box: { label: 'Image' },
            memory: { label: 'Memory' },
            cores: { label: 'Cores' },
            sshScript: { label: 'SSH Script', rows: 10 },
          }
        }
      }
    }
  }
}

class Instance {
  constructor(config, id, dir) {
    this.id = id
    this.config = config
    this.dir = dir
    this.ssh = null
  }

  launch() {
    this.vagrantfile = `
      Vagrant.configure("2") do |config|
        config.vm.box = "${this.config.box}"
        config.vm.box_check_update = false

        config.vm.provider "virtualbox" do |vb|
          vb.name = "iEMS-${this.id}" # friendly name that shows up in Oracle VM VirtualBox Manager
          vb.memory = ${this.config.memory} # memory in megabytes
          vb.cpus = ${this.config.cores} # cpu cores, can't be more than the host actually has!
          vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"] # fixes slow dns lookups
        end

        config.ssh.username = "vagrant"
        config.ssh.password = "vagrant"
      end`

    this.state = 'launching'

    fs.mkdirSync(this.dir)
    fs.writeFileSync(this.dir + '/Vagrantfile', this.vagrantfile)

    let vagrantup = spawn('vagrant', ['up'], { cwd: this.dir })

    vagrantup.stdout.on('data', (data) => console.log(`stdout: ${data.toString().trim()}`))
    vagrantup.stderr.on('data', (data) => console.log(`stderr: ${data.toString().trim()}`))

    vagrantup.on('close', (code) => {
      if (code == 0) {
        this.state = 'running'
        this.connect()
      } else {
        this.state = 'error'
      }
    })
  }

  connect() {
    exec('vagrant ssh-config', { cwd: this.dir }, (err, stdout, stderr) => {
      if (!err && stdout.indexOf('Port') !== -1) {
        this.state = 'running'

        let port = parseInt(stdout.split('\n').map(l => l.trim()).filter(l => l.startsWith('Port'))[0].split(/\s+/)[1])

        let sshconfig = {
          host: 'localhost',
          port: port,
          username: 'vagrant',
          password: 'vagrant',
          provision: this.config.sshScript
        }

        this.ssh = new SshConnection(sshconfig)
        this.ssh.connect()
      }
    })
  }

  disconnect() {
    if (this.ssh) {
      this.ssh.disconnect()
      this.ssh = null
    }
  }

  terminate() {
    this.state = 'shutting-down'

    this.disconnect()

    let destroy = spawn('vagrant', ['destroy', '-f'], { cwd: this.dir })
    destroy.stdout.on('data', (data) => console.log(`stdout: ${data.toString().trim()}`))
    destroy.stderr.on('data', (data) => console.log(`stderr: ${data.toString().trim()}`))
    destroy.on('close', (code) => console.log(`child process exited with code ${code}`))
    destroy.on('close', (code) => this.state = 'terminated')
    destroy.on('close', (code) => code == 0 && rmdir(this.dir, err => {}))
  }

  exec(cmd, cb) {
    if (this.ssh) {
      this.ssh.exec(cmd, cb)
    }
  }

  toJSON() {
    return {
      id: this.id,
      service: 'vagrant',
      state: this.state,
      instance: this.instance,
      config: this.config,
      stats: this.ssh ? this.ssh.stats : null,
      logs: this.logs
    }
  }
}

exports.Vagrant = Vagrant
