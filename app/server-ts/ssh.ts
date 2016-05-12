import ssh2 = require('ssh2')

export interface SshConfig {
  host: string
  port?: number
  username: string
  password?: string
  privateKey?: string
}

interface CancelationToken {
  canceled: boolean
}

function sshexec(ssh: ssh2.Client, cmd: string,
  cancelationToken: CancelationToken,
  cb: (err?: Error, code?: number, stdout?: string, stderr?: string) => any)
{
  ssh.exec(cmd, (err, stream) => {
    if (err) return cb(err)

    function checkIfCanceled() {
      if (cancelationToken.canceled) {
        stream.destroy()
        // todo: remove callbacks?
        return true
      } else {
        return false
      }
    }

    let stdout = ''
    let stderr = ''

    stream.on('data', (data: string) => {
      if (checkIfCanceled()) return
      stdout += data
    })

    stream.stderr.on('data', (data: string) => {
      if (checkIfCanceled()) return
      stderr += data
    })

    stream.once('close', (code: number) => {
      if (checkIfCanceled()) return
      cb(null, code, stdout, stderr)
    })
  })
}

export class SshConnection {
  config: SshConfig
  ssh: ssh2.Client
  state: string
  error: any

  constructor(config: SshConfig) {
    this.config = config
  }

  connect() {
    console.log(`connecting to ssh: ${this.config.host}`)

    this.ssh = null
    this.state = 'connecting'
    this.error = null

    let ssh: ssh2.Client = new ssh2()

    ssh.once('ready', () => {
      this.ssh = ssh
      this.state = 'connected'
      console.log('SSH: Connected')
    })

    ssh.once('error', err => {
      if (err.syscall == 'connect') {
        if (err.code == 'ECONNREFUSED' || err.code == 'ETIMEDOUT') {
          this.connect()
        } else {
          this.state = 'error'
          this.error = err
        }
      } else {
        this.disconnect()
        this.connect()
      }
    })

    ssh.once('end', () => this.disconnect())
    ssh.once('end', () => console.log('SSH: Disconnected'))

    const sshconfig: ssh2.ConnectConfig = {
      host: this.config.host,
      port: this.config.port || 22,
      username: this.config.username,
      password: this.config.password,
      privateKey: this.config.privateKey,

      readyTimeout: 2 * 60 * 1000,
      keepaliveInterval: 20 * 1000,
      keepaliveCountMax: 3
    }

    ssh.connect(sshconfig)
  }

  disconnect() {
    this.state = 'disconnecting'

    if (this.ssh) {
      this.ssh.end()
    }

    this.state = 'disconnected'

    console.log(`disconnecting from ssh: ${this.config.host}`)
  }

  exec(cmd, cb: Function): CancelationToken {
    if (this.state != 'connected')
      throw new Error('Not connected')

    //console.log(`executing ${cmd} on ${this.config.host}`)

    let cancelationToken = {
      canceled: false
    }

    sshexec(this.ssh, cmd, cancelationToken, (err, code, stdout, stderr) => {
      if (this.state != 'connected') return
      if (err) throw err
      //console.log(`executed ${cmd} with exit code ${err}`)

      //setTimeout(() => cb(), Math.random() > 0.7 ? 15000 : 10)
      setTimeout(() => cb(), 5000)
      //cb()
    })

    return cancelationToken
  }
}
