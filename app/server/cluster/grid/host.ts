import { HostSummary } from '../../../universal/grid/HostSummary'

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
  
  get id() { return this.instance.id }
  get state() { return this.instance.state }
  
  exec(cmd, cb) {
      
  }
  
  toSummary() : HostSummary {
      return null
  }
}