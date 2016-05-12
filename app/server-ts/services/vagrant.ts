import { LaunchConfig, Service, Host } from '../cluster'
import { SshConfig, SshConnection } from '../ssh'

import * as fs from 'fs'
import * as path from 'path'
import { exec, spawn } from 'child_process'

const glob = require('glob')
const rmdir = require('rimraf')

export class VagrantLaunchConfig implements LaunchConfig {
  id: string
  service: string = "vagrant"
  name: string
  box: string
  memory: number
  cores: number
  sshScript: string
}

export class VagrantServiceConfig {
  dir: string
}

export class VagrantService implements Service {
  id: string = "vagrant"
  dir: string
  vagrantVersion: string

  constructor(config: VagrantServiceConfig) {
    this.dir = config.dir
  }

  init(configs: { [id: string]: VagrantLaunchConfig }): VagrantHost[] {
    console.log('Scanning for existing vagrant instances')

    exec('vagrant --version', { cwd: this.dir }, (err, stdout, stderr) => {
      if (err) return console.error(err) // todo
      this.vagrantVersion = stdout.toString().trim()
    })

    return glob.sync(this.dir + '/*/Vagrantfile')
      .map(file => path.dirname(file))
      .map(dir => {
        let id = path.basename(dir)
        let host = new VagrantHost(id, null, dir)
        host.connect()
        return host
      })
  }

  launch(id: string, config: VagrantLaunchConfig): VagrantHost {
    let hostdir = path.join(this.dir, id)
    let host = new VagrantHost(id, config, hostdir)
    host.launch()
    return host
  }

  terminate(host: VagrantHost) {
    host.terminate()
  }
}

export class VagrantHost implements Host {
  id: string
  state: string
  dir: string
  config: VagrantLaunchConfig
  vagrantfile: string
  ssh: SshConnection

  constructor(id: string, config: VagrantLaunchConfig, dir: string) {
    this.id = id
    this.dir = dir
    this.config = config
    this.state = 'pending'
  }

  launch() {
    if (this.state != 'pending')
      throw new Error('Already launched')

    this.vagrantfile = `
      Vagrant.configure("2") do |config|
        config.vm.box = "${this.config.box}"
        config.vm.box_check_update = false

        config.vm.provider "virtualbox" do |vb|
          vb.name = "iEMS ${this.id}" # friendly name that shows up in Oracle VM VirtualBox Manager
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

    vagrantup.stdout.on('data', data => console.log(`stdout: ${data.toString().trim()}`))
    vagrantup.stderr.on('data', data => console.log(`stderr: ${data.toString().trim()}`))

    vagrantup.on('close', code => {
      if (code == 0) {
        this.state = 'launched'
        this.connect()
      } else {
        this.state = 'error'
      }
    })
  }

  terminate() {
    if (this.state != 'running' && this.state != 'error')
      throw new Error('Not launched')

    this.state = 'terminating'

    this.disconnect()

    let destroy = spawn('vagrant', ['destroy', '-f'], { cwd: this.dir })
    destroy.stdout.on('data', (data) => console.log(`stdout: ${data.toString().trim()}`))
    destroy.stderr.on('data', (data) => console.log(`stderr: ${data.toString().trim()}`))
    destroy.on('close', (code) => console.log(`child process exited with code ${code}`))
    destroy.on('close', (code) => this.state = 'terminated')
    destroy.on('close', (code) => code == 0 && rmdir(this.dir, err => {}))
  }

  connect() {
    exec('vagrant ssh-config', { cwd: this.dir }, (err, stdout, stderr) => {
      if (err) return console.error(err)
      if (stdout.toString().indexOf('Port') === -1) return console.error('Missing Port in vagrant ssh-config output')

      this.state = 'running'

      let port = parseInt(stdout.toString().split('\n').map(l => l.trim()).filter(l => l.startsWith('Port'))[0].split(/\s+/)[1])

      let sshconfig: SshConfig = {
        host: 'localhost',
        port: port,
        username: 'vagrant',
        password: 'vagrant'
      }

      this.ssh = new SshConnection(sshconfig)
      this.ssh.connect()
    })
  }

  disconnect() {
    if (this.ssh) {
      this.ssh.disconnect()
      this.ssh = null
    }
  }

  exec(cmd, cb) {
    if (this.state != 'running')
      throw new Error('Not running')

    this.ssh.exec(cmd, cb)
  }
}
