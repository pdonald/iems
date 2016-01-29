"use strict"

const glob = require('glob')
const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const exec = require('child_process').exec

let SshClient = require('ssh2').Client

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

class Vagrant {
  constructor() {
    this.configs = {}
    this.instances = {}
    this.basedir = __dirname + '/../../../build/vagrant/'
  }

  connect(configs) {
    this.configs = {}
    for (let id in configs) {
      let config = configs[id]
      if (config.service == 'vagrant') {
        this.configs[id] = config
      }
    }
  }

  scan() {
    glob(this.basedir + '/*/Vagrantfile', (err, files) => {
      files.map(file => path.dirname(file)).forEach(dir => {
        let dirname = path.basename(dir)
        let configid = dirname.split('-')[0]
        let id = dirname.split('-')[1]
        let instance = new Instance(this.configs[configid], id, dir)
        this.instances[id] = instance
        instance.connect()
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

  toJSON() {
    return {
      id: 'vagrant',
      name: 'Vagrant',
      title: 'Vagrant',
      configs: this.configs,
      instances: Object.keys(this.instances).map(key => this.instances[key]),
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

    this.state = null

    this.stats = {
      lastUpdated: null,

      uptime: {
        boot: null,
        launch: null
      },

      cpu: {
        cores: null,
        model: null,
        loadavg: null
      },

      memory: {
        ram: null,
        swap: null,
        disk: null
      }
    }
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

    this.state = 'launched'

    vagrantup.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`)
    })

    vagrantup.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`)
    })

    vagrantup.on('close', (code) => {
      console.log(`child process exited with code ${code}`)
      if (code == 0) {
        this.state = 'pending'
        this.connect()
      } else {
        this.state = 'error'
      }
    })
  }

  connect() {
    exec('vagrant ssh-config', { cwd: this.dir }, (err, stdout, stderr) => {
      if (!err && stdout.indexOf('Port') !== -1) {
        let port = parseInt(stdout.split('\n').map(l => l.trim()).filter(l => l.startsWith('Port'))[0].split(/\s+/)[1])

        console.log('connecting now...')

        let ssh = new SshClient()

        ssh.once('ready', () => {
          console.log('connected')
          this.ssh = ssh

          this.refreshStatsTimer = setInterval(() => this.refreshStats(), 30 * 1000)
          this.refreshStats()

          //this.provision()

          let intv = setInterval(() => {
            if (!this.ssh) return clearInterval(intv)
            sshexec(this.ssh, 'uptime', (err, code, stdout) => {
              if (err) console.error('uptime error:', err)
              if (code != 0) console.error('uptime exit code:', code)
              if (stdout) console.log(stdout.trim())
            })
          }, 1000)
        })

        ssh.once('error', err => {
          if (err.syscall == 'connect') {
            if (err.code == 'ECONNREFUSED' || err.code == 'ETIMEDOUT') {
              this.connect()
            } else {
              throw err
              //this.log({ type: 'ssh-connect-error', errcode: err.code })
            }
          } else {
            this.disconnect()
            this.connect()
          }
        })

        ssh.once('end', () => this.disconnect())

        ssh.connect({
          host: 'localhost',
          port: port,
          username: 'vagrant',
          password: 'vagrant',

          readyTimeout: 2 * 60 * 1000,
          keepaliveInterval: 20 * 1000,
          keepaliveCountMax: 3
        })
      }
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

  terminate() {
    let destroy = spawn('vagrant', ['destroy', '-f'], { cwd: this.dir })
    destroy.stdout.on('data', (data) => console.log(`stdout: ${data}`))
    destroy.stderr.on('data', (data) => console.log(`stderr: ${data}`))
    destroy.on('close', (code) => console.log(`child process exited with code ${code}`))
    destroy.on('close', (code) => this.state = 'terminated')
  }

  refreshStats() {
    if (!this.ssh) return // disconnected

    let cmds = {
      'cat /proc/uptime': (stdout) => {
        this.stats.uptime.boot = parseInt(stdout.trim().split(/\s+/)[0])
      },
      'nproc': (stdout) => {
        this.stats.cpu.cores = parseInt(stdout.trim())
      },
      'cat /proc/loadavg': (stdout) => {
        //  0.00 0.01 0.05 2/66 4307
        this.stats.cpu.loadavg = stdout.trim().split(' ').slice(0, 3).map(n => parseFloat(n))
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
    sshexec(this.ssh, cmd, (err, code, stdout, stderr) => {
      if (err) return this.log({ type: 'ssh-error', errcode: err.code })
      if (code != 0) return this.log({ type: 'ssh-exit-error', errcode: code, stdout: stdout, stderr: stderr })
      let parsers = Object.keys(cmds).map(k => cmds[k])
      stdout.split('===\n').forEach((output, index) => parsers[index](output))
      this.stats.lastUpdated = new Date().toString()
    })
  }

  toJSON() {
    return {
      id: this.id,
      service: 'vagrant',
      state: this.state,
      connected: !!this.ssh,
      instance: this.instance,
      config: this.config,
      stats: this.stats,
      logs: this.logs
    }
  }
}

exports.Vagrant = Vagrant
