import { Job } from './job'
import { JobSpec } from '../../universal/grid/JobSpec'
import { QueueSummary } from '../../universal/grid/QueueSummary'
import { JobSummary } from '../../universal/grid/JobSummary'

function arr2obj<T>(array: T[], key: (obj: any) => string): { [key: string]: T } {
  let obj: { [key: string]: T } = {}
  for (let item of array) {
    obj[key(item)] = item
  }
  return obj
}

export class Queue {
  private id: string
  private name: string
  private jobs: { [id: string]: Job } = {}
  private nextid: number = 1
  
  constructor(options: { id: string, name: string }) {
    this.id = options.id
    this.name = options.name
  }
  
  toSummary() : QueueSummary {
    return {
      id: this.id,
      name: this.name,
      jobs: arr2obj(Object.keys(this.jobs).map(key => this.jobs[key].toSummary()), j => j.id)
    }
  }
  
  submitJobs(specs: JobSpec[]): Job[] {
    let id2job: { [id: string]: Job } = {}
    for (let spec of specs) {
      if (this.jobs[spec.id])
        throw `Job with ID ${spec.id} already exists`
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
      
      id2job[spec.id].dependencies = dependencies
      jobs.push(id2job[spec.id])
    }
    
    for (let job of jobs) {
      this.jobs[job.id] = job
    }
    
    return jobs
  }

  cancelJob(job: Job) {
    job.cancel()
  }
}
