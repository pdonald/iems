interface Instance {
  id: string
  state: string
  ssh: any
}

export class Host {
  instance: Instance
  
  constructor(instance: Instance) {
    this.instance = instance
  }
  
  get id(): string { return this.instance.id }
  get state(): string { return this.instance.state }
  
  exec(cmd: string, cb: Function) {
    if (this.instance && this.instance.ssh && this.instance.ssh.exec) {
      try {
        this.instance.ssh.exec(cmd, cb)
      } catch (e) {
        cb(e)
      }
    } else {
      cb(`Can't exec, not connected?`)
    }
  }
}