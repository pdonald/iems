import { Job } from './job'
import { JobSpec } from '../../universal/grid/JobSpec'
import { Host } from '../cluster'

export interface HostParams {
  slots: number
}

interface HostEntry {
  host: Host
  params: HostParams
}

export class Queue {
  private hosts: { [id: string]: HostEntry } = {}
  private jobs: { [id: string]: Job } = {}
  private nextid: number = 1
  private timer: NodeJS.Timer

  start() {
    if (!this.timer) {
      this.timer = setInterval(() => this.runJobs(), 500)
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  addHost(host: Host, params: HostParams) {
    if (this.hosts[host.id])
      throw new Error('Host already added')

    this.hosts[host.id] = {
      host: host,
      params: params
    }
  }

  removeHost(host: Host) {
    if (!this.hosts[host.id])
      throw new Error('Host not added')

    delete this.hosts[host.id]
  }

  listHosts(): HostEntry[] {
    return Object.keys(this.hosts).map(key => this.hosts[key])
  }

  submitJob(spec: JobSpec): Job {
    return this.submitJobReal(spec, [])
  }

  cancelJob(job: Job) {
    job.cancel()
  }

  private submitJobReal(spec: JobSpec, deps: Job[]): Job {
    const id = 'j-' + this.nextid++
    const job = this.jobs[id] = new Job(id, spec, deps)

    if (spec.depends) {
      for (let dep of spec.depends) {
        //this.submitJobReal(dep, [job])
        throw 'Not implemented'
      }
    }

    return job
  }

  listJobs(): Job[] {
    return Object.keys(this.jobs).map(key => this.jobs[key])
  }

  private nextJobs() {
    return Object.keys(this.jobs).map(key => this.jobs[key]).filter(job => job.canRun())
  }

  private runJobs() {
    console.log('---START---')
    const host = this.listHosts()[0].host
    const nextJobs = this.nextJobs()
    for (let job of nextJobs) {
      job.run(host)
    }
    console.log('---END---')
  }
}
