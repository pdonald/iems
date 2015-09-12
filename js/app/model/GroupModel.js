class GroupModel {
  constructor(obj, parent) {
    this.groups = [];
    this.processes = [];
    this.links = [];
    this.parent = parent;

    for (var key in obj) {
      this[key] = obj[key];
    }

    this.groups.forEach((g, index) => this.groups[index] = new GroupModel(g, this));
    this.processes.forEach((p, index) => this.processes[index] = new ProcessModel(p, this));
  }

  getKey() {
    return (this.parent ? this.parent.getKey() : '') + this.type + this.id;
  }

  getTitle() {
    if (this.toTitle) return this.toTitle(this);
    if (this.title) return this.title;
    return this.type;
  }

  addGroup(group) {
    group.links.forEach(l => {
      if (!l.from.id) l.from.id = group.id;
      if (!l.to.id) l.to.id = group.id;
    });

    this.groups.push(new GroupModel(group, this));
  }

  addProcess(process) {
    this.processes.push(new ProcessModel(process, this));
  }

  deleteSelected() {
    // remove selected items
    this.groups.filter(g => g.selected).slice().forEach(g => this.deleteGroup(g));
    this.processes.filter(p => p.selected).slice().forEach(p => this.deleteProcess(p));
    this.links.filter(l => l.selected).slice().forEach(l => this.deleteLink(l));
    // if anything is selected in subgroups, delete it as well
    this.groups.forEach(g => g.deleteSelected());
  }

  deleteGroup(group) {
    this.groups.splice(this.groups.indexOf(group), 1);
    this.links.slice().forEach(l => {
      if (l.from.id == group.id || l.to.id == group.id) {
        this.deleteLink(l);
      }
    });
  }

  deleteProcess(process) {
    this.processes.splice(this.processes.indexOf(process), 1);
    this.links.slice().forEach(l => {
      if (l.from.id == process.id || l.to.id == process.id) {
        this.deleteLink(l);
      }
    });
  }

  deleteLink(link) {
    this.links.splice(this.links.indexOf(link), 1);
  }

  getSize() {
    if (this.width && this.height) {
      return { width: this.width, height: this.height };
    } else {
      return this.getCalculatedSize();
    }
  }

  getCalculatedSize() {
    var size = { width: this.x, height: this.y };
    var padding = 50;
    this.groups.forEach(g => {
      var groupSize = g.collapsed ? g.getSize() : g.getCalculatedSize();
      if (g.x + groupSize.width + padding > size.width) size.width = g.x + groupSize.width + padding;
      if (g.y + groupSize.height + padding > size.height) size.height = g.y + groupSize.height + padding;
    });
    this.processes.forEach(p => {
      if (p.x + p.width + padding > size.width) size.width = p.x + p.width + padding;
      if (p.y + p.height + padding > size.height) size.height = p.y + p.height + padding;
    });
    return size;
  }

  getLinkTo(id) {
    if (this.id == id) return this;
    return this.processes.filter(p => p.id == id)[0] || this.groups.filter(g => g.id == id)[0];
  }

  getLinkToGroup(id, port) {
    if (this.links) {
      var link = this.links.filter(l => l.to.id == id && l.to.port == port)[0];
      if (link) {
        var process = this.processes.filter(p => p.id == link.from.id)[0];
        if (process) {
          return { p: process, g: this, port: link.from.port };
        }
        var group = this.groups.filter(g => g.id == link.from.id)[0];
        if (group) {
          return group.getLinkToGroup(group.id, link.to.port);
        }
      }
    }
    if (this.groups) {
      for (var i in this.groups) {
        var result = this.groups[i].getLinkToGroup(id, port);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  getStatus(status) {
    if (!status) return;

    var procs = this.processes.map(p => p.name + '-g' + this.id + 'p' + p.id);
    var pstatuses = procs.map(p => status[p]).filter(s => s);
    var gstatuses = this.groups.map(g => g.getStatus(status));

    if (pstatuses.indexOf('running') !== -1 || gstatuses.indexOf('running') !== -1) {
      return 'running';
    }

    if (pstatuses.filter(s => s == 'done').length == procs.length && gstatuses.filter(s => s == 'done').length == this.groups.length) {
      return 'done';
    }

    //console.log(this.id, this.name, pstatuses, gstatuses, gstatuses.length, this.groups.length);

    return;
  }
}
