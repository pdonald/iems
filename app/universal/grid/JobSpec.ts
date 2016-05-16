export interface JobSpec {
  id: string
  cmd: string
  depends: string[]
}