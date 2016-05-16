import Tools from './Tools'
import GroupModel from './GroupModel'

export default class ProcessModel {
  public id: string;
  public title: string;
  public type: string;
  public template: any;
  public x: any;
  public y: any;
  public selected: any;
  public group: GroupModel;
  public params: any;
  public width: any;
  public height: any;
  
  constructor(obj, group) {
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

  getTitle() {
    if (this.title) return this.title;
    if (this.template.toTitle) return this.template.toTitle(this, this.getParamValues());
    if (this.template.title) return this.template.title;
    return this.type;
  }

  getSize() {
    return {
      width: this.width || this.template.width || Math.max(150, Object.keys(this.template.input).length * 50),
      height: this.height || this.template.height || 50
    };
  }

  getPorts() {
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

  getInputs(): { process: ProcessModel, port: string }[] {
    var result = []
    for (let link of this.group.links.filter(l => l.to.id == this.id)) {
      result = result.concat(this.group.resolveLinkInput(link));
    }
    return result;
  }
  
  dependsOn(p: ProcessModel): boolean {
    for (let input of this.getInputs()) {
      if (input.process == p) {
        return true;
      }
    }
    return false;
  }

  getKey(): string {
    return this.type + '-g' + this.group.id + 'p' + this.id;
  }

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
      prev.push(input.process.getHashKey() + '/' + input.port);
    }
    return prev.join('->') + key.join(';');
  }

  getMakefileKey(port?: string): string {
    var hash = ProcessModel.hashFnv32a(this.getHashKey());
    return this.type + '-' + hash + (port ? '.' + port : '');
  }

  getStatus() {
    if (this.group.doc.status) {
      return this.group.doc.status[this.getMakefileKey()];
    }
  }

  static isLinkValid(a, b): boolean {
    var atype = a.type || a;
    var btype = b.type || b;
    if (atype == 'file<any>' || btype == 'file<any>') return true;
    return atype == btype;
  }

  static hashFnv32a(str: string): string {
    var i, l, hval = 0x811c9dc5;
    for (i = 0, l = str.length; i < l; i++) {
        hval ^= str.charCodeAt(i);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
  }
}
