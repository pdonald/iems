import { LaunchConfig, Service, Host } from '../cluster'
import { SshConfig, SshConnection } from '../ssh'

export class LocalSshLaunchConfig implements LaunchConfig {
  id: string
  service: string = "localssh"
  name: string
  sshHost: string
  sshPort: number
  sshUsername: string
  sshPassword: string
  sshPrivateKey: string
  sshScript: string
}

export class LocalSshService implements Service {
  id: string = "localssh"

  init(): LocalSshHost[] {
    return []
  }

  launch(id: string, config: LocalSshLaunchConfig): LocalSshHost {
    let host = new LocalSshHost(id, config)
    host.launch()
    return host
  }

  terminate(host: LocalSshHost) {
    host.terminate()
  }
}


export class LocalSshHost implements Host {
  id: string
  state: string
  config: LocalSshLaunchConfig
  ssh: SshConnection

  constructor(id: string, config: LocalSshLaunchConfig) {
    this.id = id
    this.config = config
    this.state = 'pending'
  }

  launch() {
    if (this.state != 'pending')
      throw new Error('Already launched')

    this.state = 'launching'

    let sshconfig: SshConfig = {
      host: this.config.sshHost,
      port: this.config.sshPort,
      username: this.config.sshUsername,
      password: this.config.sshPassword,
      privateKey: this.config.sshPrivateKey
    }

    this.ssh = new SshConnection(sshconfig)
    this.ssh.connect()

    this.state = 'running'
  }

  terminate() {
    if (this.state != 'running')
      throw new Error('Cannot terminate if not running')

    this.state = 'terminating'

    this.ssh.disconnect()
    this.ssh = null

    this.state = 'terminated'
  }

  exec(cmd, cb) {
    if (this.state != 'running')
      throw new Error('Not running')

    this.ssh.exec(cmd, cb)
  }
}
