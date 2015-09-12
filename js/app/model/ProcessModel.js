class ProcessModel {
  constructor(obj, group) {
    for (var key in obj) {
      this[key] = obj[key];
    }

    this.group  = group;
    this.params = this.params || {};
    this.template = Tools.processes[this.type];
  }

  getTitle() {
    if (this.title) return this.title;
    if (this.template.toTitle) return this.template.toTitle(this, resolveParams(this.params, this.group.doc.vars));
    if (this.template.title) return this.template.title;
    return this.type;
  }

  getKey() {
    return this.type + '-g' + this.group.id + 'p' + this.id;
  }

  static isLinkValid(a, b) {
    var atype = a.type || a;
    var btype = b.type || b;
    //console.log(atype, btype)
    return atype == btype;
  }
}
