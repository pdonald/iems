import { JobSummary } from './JobSummary'
import { HostSummary } from './HostSummary'

export interface QueueSummary {
  id: string
  name: string
  jobs: { [id: string]: JobSummary }
  hosts: { [id: string]: HostSummary }
}