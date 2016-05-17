import { JobSummary } from './JobSummary'

export interface QueueSummary {
  id: string
  name: string
  jobs: { [id: string]: JobSummary }
}