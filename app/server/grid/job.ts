import { JobSpec } from '../../universal/grid/JobSpec'
import { JobSummary } from '../../universal/grid/JobSummary'

export class Job {
  id: string
  state: string
  dependencies: Job[]
  cmd: string

  constructor(id: string, spec: JobSpec, deps: Job[]) {
    this.id = id
    this.cmd = spec.cmd
    this.dependencies = deps
    this.state = 'pending'
  }
  
  toSummary() : JobSummary {
    return {
      id: this.id,
      cmd: this.cmd,
      state: this.state,
      dependencies: this.dependencies.map(j => j.id)
    }
  }

  canRun(): boolean {
    if (this.state == 'pending') {
      for (let dependency of this.dependencies) {
        if (!dependency.isFinished()) {
          return false
        }
      }
      return true
    }
    return false
  }

  isFinished(): boolean {
    return this.state == 'finished'
  }

  cancel() {
    this.state = 'canceled'
  }
}
