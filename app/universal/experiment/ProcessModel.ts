import Tools from './Tools'
import GroupModel from './GroupModel'

export default class ProcessModel {
  public id: string;
  public title: string;
  public type: string;
  public template: any;
  public x: number;
  public y: number;
  public selected: boolean;
  public group: GroupModel;
  public params: { [key: string]: string };
  public width: number;
  public height: number;
  public doc: any;
  
  constructor(obj, group: GroupModel) {
    for (var key in obj) {
      this[key] = obj[key];
    }

    if (!(this.type in Tools.processes))
      throw Error('No such tool: ' + this.type);

    this.group  = group;
    this.params = this.params || {};
    this.template = Tools.processes[this.type];

    for (var key in this.template.params) {
      if (!this.params[key] && this.template.params[key].default) {
        this.params[key] = this.template.params[key].default;
      }
    }
  }
  
  /**
   * Unique ID for this process in an experiment.
   */
  getFullId(sep: string = '.'): string {
    let ids = [];
    ids.push(this.id);
    let group = this.group;
    while (group) {
      ids.push(group.id);
      if (group.parent) {
        group = group.parent;
      } else {
        ids.push(group.doc.id);
        break;
      }
    }
    return ids.reverse().join(sep);
  }

  /**
   * Key for React. 
   * This key uniquely identifies this process in a group, but not in an experiment.
   */
  getKey(): string {
    return this.type + '-g' + this.group.id + 'p' + this.id;
  }

  /**
   * Gets a key that uniquely represents the path that needs to be taken
   * to arrive at the output file of this particular process (template, parameters, previous processes).
   */
  getHashKey(): string {
    var key = [];
    key.push('template='  + this.type);
    key.push('templateVer=' + this.template.version);
    var params = this.getParamValues();
    for (var name in this.template.params) {
      if (this.template.params[name].nohash)
        continue;
      if (name in params) {
        key.push(`param:${name}=${params[name]}`);
      }
    }
    var prev = [];
    for (let input of this.getInputs()) {
      prev.push(input.process.getHashKey() + '/' + input.outPort);
    }
    return prev.join('->') + key.join(';');
  }

  getTitle(): string {
    if (this.title) return this.title;
    if (this.template.toTitle) return this.template.toTitle(this, this.getParamValues());
    if (this.template.title) return this.template.title;
    return this.type;
  }

  getSize(): { width: number, height: number } {
    return {
      width: this.width || this.template.width || Math.max(150, Object.keys(this.template.input).length * 50),
      height: this.height || this.template.height || 50
    };
  }

  getPorts(): { input: string[], output: string[] } {
    return {
      input: Object.keys(this.template.input.call ? this.template.input(this, this.getParamValues()) : this.template.input),
      output: Object.keys(this.template.output.call ? this.template.output(this, this.getParamValues()) : this.template.output)
    }
  }

  getPortsInfo() {
    return {
      input: this.template.input.call ? this.template.input(this, this.getParamValues()) : this.template.input,
      output: this.template.output.call ? this.template.output(this, this.getParamValues()) : this.template.output
    }
  }

  getInputs(debug: boolean = false): { process: ProcessModel, outPort: string, inPort: string }[] {
    var result = []
    for (let link of this.group.links.filter(l => l.to.id == this.id)) {
      result = result.concat(this.group.getLinkInput(link, debug));
    }
    return result;
  }
  
  /**
   * Checks if another process needs to run
   * before this process can be executed.
   */
  dependsOn(p: ProcessModel): boolean {
    for (let input of this.getInputs()) {
      if (input.process == p) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Replaces variables with corresponding values
   * in experiment parameters.
   */
  getParamValues() {
    function resolveParams(params, vars) {
      var result = {};
      for (var key in params) {
        if (params[key][0] == '$') {
          if (params[key].substr(1) in vars) {
            result[key] = vars[params[key].substr(1)];
          } else {
            result[key] = undefined;
          }
        } else {
          result[key] = params[key];
        }
      }
      return result;
    }

    return resolveParams(this.params, this.group.doc.vars);
  }

  getStatus(): string {
    if (this.group.doc.status) {
      return this.group.doc.status[this.getFullId()]
    }
  }

  static isLinkValid(a, b): boolean {
    var atype = a.type || a;
    var btype = b.type || b;
    if (atype == 'file<any>' || btype == 'file<any>') return true;
    return atype == btype;
  } 
}
