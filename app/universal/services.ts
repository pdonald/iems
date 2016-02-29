class ServiceMgr {
  services: any
  hosts: any
  configs: any
}

interface Servicex {
  launch(config: LaunchConfig): Host
  terminate(host: Host)
}

interface Host {
  state: string
  exec(cmd, cb)
}

class LocalSshService implements Servicex {
  launch(config: LocalSshLaunchConfig): LocalSshHost {
    const host = new LocalSshHost("h-1", config)
    host.launch()
    return host
  }

  terminate(host: LocalSshHost) {
    host.terminate()
  }
}

class LocalSshHost implements Host {
  config: LocalSshLaunchConfig
  ssh: SshConnection
  state: string

  constructor(id: string, config: LocalSshLaunchConfig) {
    this.config = config
  }

  launch() {
    this.state = 'launching'
    this.connect()
  }

  terminate() {
    this.state = 'terminating'
    this.disconnect()
    this.state = 'terminated'
  }

  connect() {
    if (this.ssh)
      throw new Error('Already connected')

    this.state = 'running'

    this.ssh = new SshConnection()
    this.ssh.connect()
  }

  disconnect() {
    if (this.ssh) {
      this.ssh.disconnect()
      this.ssh = null
    }
  }

  exec(cmd, cb) {
    if (!this.ssh)
      throw new Error('Not connected')

    this.ssh.exec(cmd, cb)
  }
}

class SshConnection {
  connect() { }
  disconnect() { }
  exec(cmd, cb) { }
}
