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
    if (this.template.toTitle) return this.template.toTitle(this);
    if (this.template.title) return this.template.title;
    return this.type;
  }

  getKey() {
    return this.type + '-g' + this.group.id + 'p' + this.id;
  }

  getLinkTo(id, port) {
    return;
    if (l.from.id == graph.id) {
      var x = p.getLinkTo(l.from.id, l.from.port);
      if (x) input[l.to.port] = processName(x.process, x.port);
    } else {
      var x = graph.processes.filter(pp => pp.id == l.from.id)[0];
      if (x) {
        input[l.to.port] = processName(x, l.from.port);
      } else {
        x = p.getLinkTo(l.from.id, l.from.port);
        if (x) input[l.to.port] = processName(x.process, x.port);
      }
    }

    var link = this.group.links.filter(l => l.to.id == id && l.to.port == port)[0];
    if (link) {
      var process = this.group.processes.filter(p => p.id == link.from.id)[0];
      if (process) {
        return { process: process, port: link.from.port };
      }
      var group = this.group.groups.filter(g => g.id == link.from.id)[0];
      if (group) {
        return group.getLinkToGroup(group.id, link.to.port);
      }
    }

    for (var i in this.group.groups) {
      var result = this.group.groups[i].getLinkToGroup(id, port);
      if (result) {
        return result;
      }
    }

    return null;
  }
}
