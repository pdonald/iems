class ProcessModel {
  constructor(obj, group) {
    for (var key in obj) {
      this[key] = obj[key];
    }

    this.group  = group;
    this.params = this.params || {};
    this.template = Tools.processes[this.type];

    for (var key in this.template.params) {
      if (!this.params[key] && this.template.params[key].default) {
        this.params[key] = this.template.params[key].default;
      }
    }
  }

  getTitle() {
    if (this.title) return this.title;
    if (this.template.toTitle) return this.template.toTitle(this, resolveParams(this.params, this.group.doc.vars));
    if (this.template.title) return this.template.title;
    return this.type;
  }

  getInput() {
    var link = this.group.links.filter(l => l.to.id == this.id)[0];
    if (link && link.process) return this.group.resolveLinkInput(link).process;
  }

  getKey() {
    return this.type + '-g' + this.group.id + 'p' + this.id;
  }

  getHashKey() {
    var key = [];
    key.push('template='  + this.type);
    key.push('templateVer=' + this.template.version);
    var params = resolveParams(this.params, this.group.doc.vars);
    for (var name in this.template.params) {
      if (this.template.params[name].nohash)
        continue;
      if (name in params) {
        key.push(`param:${name}=${params[name]}`);
      }
    }
    var prev = this.getInput();
    return (prev ? prev.getHashKey() : '<root>') + ' -> ' + key.join(';');
  }

  getMakefileKey(port) {
    var hash = ProcessModel.hashFnv32a(this.getHashKey(), true);
    return this.type + '-' + hash + (port ? '.' + port : '');
  }

  getStatus() {
    if (this.group.doc.status) {
      return this.group.doc.status[this.getMakefileKey()];
    }
  }

  static isLinkValid(a, b) {
    var atype = a.type || a;
    var btype = b.type || b;
    //console.log(atype, btype)
    return atype == btype;
  }

  static hashFnv32a(str, asString, seed) {
    /*jshint bitwise:false */
    var i, l,
        hval = (seed === undefined) ? 0x811c9dc5 : seed;

    for (i = 0, l = str.length; i < l; i++) {
        hval ^= str.charCodeAt(i);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    if( asString ){
        // Convert to 8 digit hex string
        return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
    }
    return hval >>> 0;
  }
}
