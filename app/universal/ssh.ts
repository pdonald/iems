interface SshConnection {
  connect()
  disconnect()
  exec(cmd, cb)
}
