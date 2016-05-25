import { Job } from './job'
import { Host } from './host'
import { Scheduler } from './Scheduler'
import { JobSpec } from '../../../universal/grid/JobSpec'
import { QueueSummary } from '../../../universal/grid/QueueSummary'
import { JobSummary } from '../../../universal/grid/JobSummary'
import { HostSummary } from '../../../universal/grid/HostSummary'

function arr2obj<T>(array: T[], key: (obj: any) => string): { [key: string]: T } {
  let obj: { [key: string]: T } = {}
  for (let item of array) {
    obj[key(item)] = item
  }
  return obj
}

export interface HostInQueue {
  host: Host
  params: HostInQueueParams
}

export interface HostInQueueParams {
  slots: number
}

export class Queue {
  private id: string
  private name: string
  private jobs: { [id: string]: Job } = {}
  private hosts: { [id: string]: HostInQueue } = {}
  private scheduler: Scheduler
  
  constructor(options: { id: string, name: string }) {
    this.id = options.id
    this.name = options.name
    this.scheduler = new Scheduler(this.hosts, this.jobs)
    this.scheduler.start()
  }
  
  submitJobs(specs: JobSpec[]): Job[] {
    let id2job: { [id: string]: Job } = {}
    for (let spec of specs) {
      if (this.jobs[spec.id])
        continue // throw `Job with ID ${spec.id} already exists`
      if (id2job[spec.id])
        throw `Submitted more than one job with ID ${spec.id}`
      id2job[spec.id] = new Job(spec.id, spec, [])
    }
    
    let jobs: Job[] = []
    
    for (let spec of specs) {
      let dependencies: Job[] = []
      for (let depid of spec.dependencies) {
        const job = id2job[depid] || this.jobs[depid]
        if (!job)
          throw `Dependency job with ID ${depid} does not exist`
        dependencies.push(job)
      }
      
      if (id2job[spec.id]) {
        id2job[spec.id].dependencies = dependencies
        jobs.push(id2job[spec.id])  
      } else {
        for (let dep of dependencies) {
          let job = this.jobs[spec.id]
          if (job.dependencies.indexOf(dep) === -1) {
            job.dependencies.push(dep)
          }
        } 
      }
    }
    
    for (let job of jobs) {
      this.jobs[job.id] = job
    }
    
    return jobs
  }
  
  resetJob(id: string) {
    let job = this.jobs[id]
    if (!job) throw `Job with ID ${id} does not exit`
    job.reset()
    
    for (let depid in this.jobs) {
      let dep = this.jobs[depid]
      if (dep.dependencies.indexOf(job) !== -1) {
        this.resetJob(dep.id)
      }
    }
  }

  stopJob(id: string) {
    let job = this.jobs[id]
    if (!job) throw `Job with ID ${id} does not exit`
    job.stop()
  }
  
  deleteJob(id: string) {
    let job = this.jobs[id]
    if (!job) throw `Job with ID ${id} does not exit`
    job.stop()
    delete this.jobs[id]
    
    for (let depid in this.jobs) {
      let dep = this.jobs[depid]
      if (dep.dependencies.indexOf(job) !== -1) {
        this.deleteJob(dep.id)
      }
    }
  }
  
  addOrUpdateHost(host: Host, params: HostInQueueParams) {
    if (!host.id)
      throw new Error('Host has no id')
    
    if (!this.hosts[host.id]) {
      this.addHost(host, params)
    } else {
      this.updateHost(host, params)
    }
  }
  
  addHost(host: Host, params: HostInQueueParams) {
    if (this.hosts[host.id])
      throw new Error('Host already added')

    this.hosts[host.id] = {
      host: host,
      params: params
    }
  }
  
  updateHost(host: Host, params: HostInQueueParams) {
    if (!this.hosts[host.id])
      throw new Error('Host not added')
    
    this.hosts[host.id].params = params
  }

  removeHost(host: Host) {
    if (!this.hosts[host.id])
      throw new Error('Host not added')
      
    // todo: cancel jobs that are running on this host

    delete this.hosts[host.id]
  }
  
  getHosts(): Host[] {
    return Object.keys(this.hosts).map(h => this.hosts[h].host)
  }
  
  destroy() {
    this.scheduler.stop()
    for (let id in this.jobs) this.deleteJob(id)
    for (let id in this.hosts) this.removeHost(this.hosts[id].host)
  }
  
  toSummary() : QueueSummary {
    function maphost(h: HostInQueue): HostSummary {
      return {
        id: h.host.id,
        state: h.host.state,
        slots: h.params.slots
      }
    }
    
    return {
      id: this.id,
      name: this.name,
      jobs: arr2obj(Object.keys(this.jobs).map(key => this.jobs[key].toSummary()), j => j.id),
      hosts: arr2obj(Object.keys(this.hosts).map(key => maphost(this.hosts[key])), j => j.id)
    }
  }
}
