export interface JobSummary {
  id: string
  cmd: string
  state: string
  dependencies: string[]
}