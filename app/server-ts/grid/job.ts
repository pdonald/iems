import { Host } from '../cluster'

export interface JobSpec {
  cmd: string
  exitCode?: number
  depends?: JobSpec[]
}

export class Job {
  id: string
  state: string
  depends: Job[]
  cmd: string
  exitCode: number

  constructor(id: string, spec: JobSpec, deps: Job[]) {
    this.id = id
    this.cmd = spec.cmd
    this.exitCode = spec.exitCode || 0
    this.depends = deps
    this.state = 'pending'
  }

  canRun(): boolean {
    if (this.state == 'pending') {
      for (let dep of this.depends) {
        if (!dep.isFinished()) {
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

  run(host: Host) {
    try {
      this.state = 'running'

      let timer = setTimeout(() => {
        this.state = 'failed'
        console.log(`Failed ${this.id} with timeout`)
      }, 10000)

      host.exec(this.cmd, () => {
        clearTimeout(timer)
        this.state = 'finished'
        console.log(`Finished ${this.id}`)
      })

      console.log(`Running ${this.id}`)
    } catch (e) {
      this.state = 'pending'
    }
  }

  cancel() {
    this.state = 'canceled'
  }
}
