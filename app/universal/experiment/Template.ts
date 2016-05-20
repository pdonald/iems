import ProcessModel from './ProcessModel'
import GroupModel from './GroupModel'

export interface TemplateParamDefinition {
  type: string
  default: string
  nohash?: boolean
}

export interface TemplateInputOutputParams {
  [name: string]: string
}

export interface StaticInputOutput {
  [name: string]: string | DynamicInputOutputType
}

export interface DynamicInputOutputType {
  type: string
  title: (p: ProcessModel, params: any) => string
}

export type DynamicInputOutput = (p: ProcessModel, params: TemplateInputOutputParams) => StaticInputOutput

export interface Link {
  from: { id: number, port: string }
  to: { id: number, port: string }
  selected?: boolean
}

export interface Template {
  type: string
  title: string
  category: string
  version?: string
  width?: number
  height?: number
  params: { [name: string]: string | TemplateParamDefinition }
  input: StaticInputOutput | DynamicInputOutput
  output: StaticInputOutput | DynamicInputOutput
  toTitle?: (p: ProcessModel, params: TemplateInputOutputParams) => string
  toBash: (params: TemplateInputOutputParams, input: { [name: string]: string }, output: { [name: string]: string }) => string[]
  validate?: (params: TemplateInputOutputParams) => boolean
}

export interface GroupTemplate {
  type: string
  title: string
  category: string
  width?: number
  height?: number
  ports: { input: string[], output: string[] }
  processes: ProcessModel[]
  links: Link[]
  groups?: GroupModel[]
}