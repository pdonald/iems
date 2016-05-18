export interface JobSummary {
  id: string
  name: string
  cmd: string
  state: string
  dependencies: string[]
}