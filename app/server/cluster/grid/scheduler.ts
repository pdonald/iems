import { Job } from './job'
import { Host } from  './host'
import { HostInQueue } from './queue'
import { CancelationToken } from '../sshexec'

export class Scheduler {
  private timer: NodeJS.Timer
  private hosts: { [id: string]: HostInQueue }
  private jobs: { [id: string]: Job }
  private active: { [host: string]: Job[] }
  
  constructor(hosts: { [id: string]: HostInQueue }, jobs: { [id: string]: Job }) {
    this.hosts = hosts
    this.jobs = jobs
    this.active = {}
  }
  
  start() {
    this.timer = setInterval(() => this.run(), 500)
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
  
  private get slots(): { total: number, used: number, free: number } {
    let total = Object.keys(this.hosts).reduce(((sum, key) => sum + this.hosts[key].params.slots), 0)
    let used = Object.keys(this.active).reduce(((sum, key) => sum + this.active[key].length), 0)
    
    return {
      total: total,
      used: used,
      free: total - used
    }
  }
  
  private nextAvailableHost(): Host {
    for (let hostid in this.hosts) {
      let slots = this.hosts[hostid].params.slots
      let used = this.active[hostid] ? this.active[hostid].length : 0
      let free = slots - used
      if (free > 0) {
        return this.hosts[hostid].host
      }
    }
    return null
  }
  
  private run() {
    let numjobs = Object.keys(this.jobs).length
    let numhosts = Object.keys(this.hosts).length
     
    let pendingjobs = Object.keys(this.jobs).map(key => this.jobs[key]).filter(j => j.state == 'pending')
    let runnablejobs = pendingjobs.filter(j => j.isRunnable)
    
    let slots = this.slots
    
    //console.log(`Running scheduler, I have ${numjobs} total jobs, ${pendingjobs.length} pending jobs, ${runnablejobs.length} runnable, ${numhosts} hosts with ${slots.total} total and ${slots.free} free slots`)
    
    runnablejobs.slice(0, slots.free).forEach(job => this.runJob(job))
  } 
  
  private runJob(job: Job, host?: Host) {
    if (!host) {
      host = this.nextAvailableHost()
    }
    
    console.log(`Scheduling ${job.name}`)
    
    console.log(`Got ${host.id} available for ${job.name}`)
    if (!this.active[host.id]) this.active[host.id] = []
    this.active[host.id].push(job)
    
    let cancelationToken: CancelationToken
    let timer = setInterval(function() {
      if (job.state == 'stopped') {
        console.log(`Job ${job.id} was canceled...`, cancelationToken)
        if (cancelationToken) cancelationToken.canceled = true
      }
    }, 500)
    
    job.startRuning(host)
    cancelationToken = host.exec(job.cmd, (err, exitCode, stdout, stderr) => {
      clearInterval(timer)
      
      if (!this.timer) return // scheduler was stopped
      if (!this.hosts[host.id]) return // host was removed
      if (!this.active[host.id]) return // host was removed 
      if (this.active[host.id].indexOf(job) === -1) return // job was canceled
      
      job.finishRunning(err, exitCode, stdout, stderr)
      this.active[host.id].splice(this.active[host.id].indexOf(job), 1)
      console.log(`Job ${job.name} finished, err: ${err}, code: ${exitCode}, stdout: ${stdout}, stderr: ${stderr}`)
    })
  }
}
