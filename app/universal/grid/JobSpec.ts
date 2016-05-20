export interface JobSpec {
  id: string
  name: string
  cmd: string
  dependencies: string[]
  tags: { [name: string]: any }
}