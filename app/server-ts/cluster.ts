import { Queue } from './grid/queue'

export interface LaunchConfig {
  id: string
  service: string
  name: string
}

export interface Host {
  id: string
  state: string
  exec(cmd, cb)
}

export interface Service {
  id: string
  init(configs: { [id: string]: LaunchConfig }): Host[]
  launch(id: string, config: LaunchConfig): Host
  terminate(host: Host)
}

export class Cluster {
  services: { [name: string]: Service } = {}
  hosts: { [id: string]: Host } = {}
  configs: { [id: string]: LaunchConfig } = {}
  queues: { [id: string]: Queue } = {}

  addService(service: Service) {
    service.id = this.genid('s-', this.services)
    this.services[service.id] = service
  }

  addConfig(config: LaunchConfig) {
    config.id = this.genid('c-', this.configs)
    this.configs[config.id] = config
  }

  launch(configId: string): Host {
    let config = this.configs[configId]
    let service = this.services[config.service]
    let id = this.genid('h-', this.hosts)
    return this.hosts[id] = service.launch(id, config)
  }

  terminate(hostId: string) {
    // cancel jobs
    // remove from queues
    // disconnect
    // terminate host
  }

  private genid(prefix: string, obj: {}): string {
    let i = Object.keys(obj).length + 1
    while (obj[prefix + i]) {
      i++
    }
    return prefix + i
  }
}
