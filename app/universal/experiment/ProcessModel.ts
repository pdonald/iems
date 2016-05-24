import GroupModel from './GroupModel'
import DocumentModel from './DocumentModel'
import { Template, TemplateParamDefinition, DynamicInputOutput } from './Template'

export interface ProcessSpec {
  id: number
  x: number
  y: number
  width?: number
  height?: number
  type: string
  params: { [name: string]: string }
}

export default class ProcessModel {
  public id: number
  public type: string
  public template: Template
  public params: { [key: string]: string }
  public group: GroupModel
  
  public x: number
  public y: number
  public width: number
  public height: number
  public selected: boolean
  
  constructor(p: ProcessSpec, template: Template, group: GroupModel) {
    this.id = p.id
    this.type = p.type
    this.template = template
    this.x = p.x
    this.y = p.y
    this.width = p.width
    this.height = p.height
    this.group  = group
    
    this.params = p.params || {}

    for (var key in this.template.params) {
      if (!this.params[key] && (<TemplateParamDefinition>this.template.params[key]).default) {
        this.params[key] = (<TemplateParamDefinition>this.template.params[key]).default
      }
    }
  }
  
  /**
   * Unique ID for this process in an experiment.
   */
  getFullId(sep: string = '.'): string {
    let ids = []
    ids.push(this.id)
    let group = this.group
    while (group) {
      ids.push(group.id)
      if (group.parent) {
        group = group.parent
      } else {
        ids.push(group.doc.id)
        break
      }
    }
    return ids.reverse().join(sep)
  }

  /**
   * Key for React. 
   * This key uniquely identifies this process in a group, but not in an experiment.
   */
  getKey(): string {
    return 'P' + this.id
  }

  /**
   * Gets a key that uniquely represents the path that needs to be taken
   * to arrive at the output file of this particular process (template, parameters, previous processes).
   */
  getHashKey(): string {
    var key = []
    key.push('template='  + this.type)
    key.push('templateVer=' + this.template.version)
    var params = this.getParamValues()
    for (var name in this.template.params) {
      if ((<TemplateParamDefinition>this.template.params[name]).nohash)
        continue
      if (name in params) {
        key.push(`param:${name}=${params[name]}`)
      }
    }
    var prev = []
    for (let input of this.getInputs()) {
      prev.push(input.process.getHashKey() + '/' + input.outPort)
    }
    return prev.join('->') + key.join(';')
  }

  getTitle(): string {
    if (this.template.toTitle) return this.template.toTitle(this, this.getParamValues())
    if (this.template.title) return this.template.title
    return this.type
  }

  getSize(): { width: number, height: number } {
    return {
      width: this.width || this.template.width || Math.max(150, Object.keys(this.template.input).length * 50),
      height: this.height || this.template.height || 50
    }
  }

  getPorts(): { input: string[], output: string[] } {
    return {
      input: Object.keys((<DynamicInputOutput>this.template.input).call ? (<DynamicInputOutput>this.template.input)(this, this.getParamValues()) : this.template.input),
      output: Object.keys((<DynamicInputOutput>this.template.output).call ? (<DynamicInputOutput>this.template.output)(this, this.getParamValues()) : this.template.output)
    }
  }

  getPortsInfo() {
    return {
      input: (<DynamicInputOutput>this.template.input).call ? (<DynamicInputOutput>this.template.input)(this, this.getParamValues()) : this.template.input,
      output: (<DynamicInputOutput>this.template.output).call ? (<DynamicInputOutput>this.template.output)(this, this.getParamValues()) : this.template.output
    }
  }

  getInputs(): { process: ProcessModel, outPort: string, inPort: string }[] {
    var result = []
    for (let link of this.group.links.filter(l => l.to.id == this.id)) {
      var input = this.group.getLinkInput(link)
      if (input) {
        result.push(input)
      }
    }
    return result
  }
  
  /**
   * Checks if another process needs to run
   * before this process can be executed.
   */
  dependsOn(p: ProcessModel): boolean {
    for (let input of this.getInputs()) {
      if (input.process == p) {
        return true
      }
    }
    return false
  }
  
  /**
   * Replaces variables with corresponding values
   * in experiment parameters.
   */
  getParamValues(): { [name: string]: string } {
    var result: { [name: string]: string } = {}
    for (var key in this.params) {
      result[key] = this.getParamValue(key)
    }
    return result
  }
  
  getParamValue(p: string): string {
    let vars = this.group.doc.vars
    let value = this.params[p]
    //if (value === null || typeof value === 'undefined' || value === '') {
      //value = (<TemplateParamDefinition>this.template.params[p]).default
    //}
    if (value && value[0] == '$') {
      let name = value.substr(1) 
      if (name in vars) {
        return vars[name]
      } else {
        return undefined
      }
    } else {
      return value
    }
  }

  getStatus(): string {
    if (this.group.doc.status) {
      return this.group.doc.status[this.getFullId()]
    }
  }
  
  isValid(): boolean {
    for (let p in this.template.params) {
      if (this.isParamInvalid(p)) {
        return false
      }
    }
    
    if (this.template.validate) {
      return !!this.template.validate(this.getParamValues())
    }
    
    return true
  }
  
  isParamInvalid(p: string): string {
    let ptpl = this.template.params[p]
    let tpl: TemplateParamDefinition = typeof ptpl === 'string' ? { type: ptpl as string } : ptpl as TemplateParamDefinition
    let value = this.getParamValue(p)
    
    if (!value && (tpl.required || !tpl.optional)) {
      return 'This is a required field'
    }
    
    if (!value && tpl.optional) return
    
    if (tpl.type === 'path' && value[0] != '/') {
      return 'This must be a path and start with /'
    }
    
    if (tpl.type == 'uint' || tpl.type == 'int' || tpl.type == 'integer') {
      let intval = parseInt(value, 10)
      if (isNaN(intval)) return 'This is not a valid number'
      let min = Number.MIN_VALUE
      let max = Number.MAX_VALUE
      if (tpl.type == 'uint') min = 0
      if (tpl.min) min = tpl.min
      if (tpl.max) max = tpl.max
      if (intval > max) return `Max possible value is ${max}`
      if (intval < min) return `Min possible value is ${min}`
    }
    
    if (tpl.type === 'lang' || tpl.type === 'language' || tpl.type == 'lang2' || tpl.type == 'language2') {
      if (value.length !== 2) return 'Language code is expected to be 2 chars'
    }
    
    if (tpl.options) {
      if (tpl.options.indexOf(value) === -1) {
        return 'Value must be one of: ' + tpl.options.join(', ')
      }
    }
    
    return null
  }

  static isLinkValid(a, b): boolean {
    var atype = a.type || a
    var btype = b.type || b
    if (atype == 'file<any>' || btype == 'file<any>') return true
    return atype == btype
  } 
}
