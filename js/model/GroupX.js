class GroupX {
  constructor(obj) {
    this.groups = [];
    this.processes = [];
    this.links = [];

    for (var key in obj) {
      this[key] = obj[key];
    }

    if (this.groups) {
      this.groups.forEach((g, index) => {
        this.groups[index] = new GroupX(g);
      });
    }
  }

  addGroup(group) {
    group.links.forEach(l => {
      // todo: id 1 is hardcoded
      if (l.from.id == 1) l.from.id = group.id;
      if (l.to.id == 1) l.to.id = group.id;
    });
    this.groups.push(new GroupX(group));
  }

  addProcess(process) {
    this.processes.push(process);
  }

  getContainerFor(id) {
    if (this.id == id) {
      return this;
    }
    if (this.processes) {
      for (var i in this.processes) {
        if (this.processes[i].id == id) {
          return this;
        }
      }
    }
    if (this.groups) {
      for (var i in this.groups) {
        var result = this.groups[i].getContainerFor(id);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  getSize() {
    if (this.width && this.height) {
      return { width: this.width, height: this.height };
    }
    return this.getCalculatedSize();
  }

  getCalculatedSize() {
    var size = { width: this.x, height: this.y };
    var padding = 50;
    this.groups.forEach(g => {
      var groupSize = g.getCalculatedSize();
      if (g.x + groupSize.width + padding > size.width) size.width = g.x + groupSize.width + padding;
      if (g.y + groupSize.height + padding > size.height) size.height = g.y + groupSize.height + padding;
    });
    this.processes.forEach(p => {
      if (p.x + p.width + padding > size.width) size.width = p.x + p.width + padding;
      if (p.y + p.height + padding > size.height) size.height = p.y + p.height + padding;
    });
    return size;
  }

  isConnectionError() {
    return true;
    return this.processes.filter(p => Tools.processes[p.name].isError && Tools.processes[p.name].isError(p)).length > 0;
  }

  deleteSelected() {
    this.groups.filter(g => g.selected).slice().forEach(g => this.deleteGroup(g));
    this.processes.filter(p => p.selected).slice().forEach(p => this.deleteProcess(p));
    this.links.filter(l => l.selected).slice().forEach(l => this.deleteLink(l));
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
}
