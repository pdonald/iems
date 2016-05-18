import { JobSpec } from '../../../universal/grid/JobSpec'
import { JobSummary } from '../../../universal/grid/JobSummary'

export class Job {
  id: string
  name: string
  state: string
  dependencies: Job[]
  cmd: string

  constructor(id: string, spec: JobSpec, deps: Job[]) {
    this.id = id
    this.name = spec.name
    this.cmd = spec.cmd
    this.dependencies = deps
    this.state = 'pending'
  }
  
  get globalState(): string {
    if (this.state != 'pending') return this.state
    
    for (let dependency of this.dependencies) {
      let depstate = dependency.globalState
      if (depstate == 'error') return 'error'
      if (depstate == 'canceled') return 'canceled'
    }

    return 'pending'
  }

  get isRunnable(): boolean {
    if (this.state == 'pending') {
      for (let dependency of this.dependencies) {
        if (!dependency.isFinished) {
          return false
        }
      }
      return true
    }
    return false
  }

  get isFinished(): boolean {
    return this.state == 'finished'
  }
  
  startRuning() {
    this.state = 'running'
  }
  
  finishRunning(err: any, exitCode: number, stdout: string, stderr: string) {
    if (!err && exitCode == 0) {
      this.state = 'finished'
    } else {
      this.state = 'error'
    }
  }

  cancel() {
    this.state = 'canceled'
  }
  
  toSummary(): JobSummary {
    return {
      id: this.id,
      name: this.name,
      cmd: this.cmd,
      state: this.state,
      globalState: this.globalState,
      dependencies: this.dependencies.map(j => j.id)
    }
  }
}
