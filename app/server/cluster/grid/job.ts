import { JobSpec } from '../../../universal/grid/JobSpec'
import { JobSummary } from '../../../universal/grid/JobSummary'
import { Host } from './host'

export class Job {
  id: string
  name: string
  state: string
  dependencies: Job[]
  cmd: string
  tags: { [name: string]: string }

  constructor(id: string, spec: JobSpec, deps: Job[]) {
    this.id = id
    this.name = spec.name
    this.cmd = spec.cmd
    this.dependencies = deps
    this.tags = spec.tags
    this.state = 'pending'
  }
  
  get globalState(): string {
    for (let dependency of this.dependencies) {
      let depstate = dependency.globalState
      if (depstate == 'error') return 'error'
      if (depstate == 'canceled') return 'canceled'
    }
    
    return this.state
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
  
  startRuning(host: Host) {
    this.state = 'running'
    this.tags['host'] = host.id
  }
  
  finishRunning(err: any, exitCode: number, stdout: string, stderr: string) {
    if (this.state == 'canceled') {
      return
    }
    
    if (!err && exitCode == 0) {
      this.state = 'finished'
    } else {
      this.state = 'error'
    }
  }
  
  reset() {
    this.state = 'pending'
    // todo: reset jobs that depend on this
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
      dependencies: this.dependencies.map(j => j.id),
      tags: this.tags
    }
  }
}
