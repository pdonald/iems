import ssh2 = require('ssh2')

export interface CancelationToken {
  canceled: boolean
}

export interface SshExecCallback {
  (err?: any, code?: number, stdout?: string, stderr?: string): void
}

export function sshexec(ssh: ssh2.Client, cmd: string, cb: SshExecCallback): CancelationToken {
  let cancelationToken: CancelationToken = { canceled: false }
  let processID = null
  let done = false
  
  function alreadyDone() {
    return done || cancelationToken.canceled
  }
  
  ssh.exec('echo PID:$$:; ' + cmd, (err, stream) => {
    let exitCode = null
    let stdout = ''
    let stderr = ''
    let timer: NodeJS.Timer = null
    
    function onStdout(data: string) {
      if (alreadyDone()) return finish()
      data = data.toString()
      if (data.substr(0, 4) === 'PID:') {
        processID = data.substring(4, data.indexOf(':', 4))
      }
      stdout += data
    }
    
    function onStderr(data: string) {
      if (alreadyDone()) return finish()
      stderr += data
    }
    
    function onClose(code: number) {
      if (alreadyDone()) return finish()
      exitCode = code
      finish()
    }
    
    function onTick() {
      if (alreadyDone()) return finish()
    }
    
    function finish() {
      if (done) return
      done = true
      
      if (stream) {
        stream.removeAllListeners()
        stream.stderr.removeAllListeners()
        stream.end()
        if (cancelationToken.canceled) {
          if (processID) {
            ssh.exec('pkill -g ' + processID, function() {})
          }
        }
      }
      
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      
      cb(err, exitCode, stdout, stderr)
    }
    
    if (alreadyDone()) finish()
    if (err) return finish()

    stream.on('data', onStdout)
    stream.stderr.on('data', onStderr)
    stream.once('close', onClose)
    timer = setInterval(onTick, 1000)
  })
  
  return cancelationToken
}