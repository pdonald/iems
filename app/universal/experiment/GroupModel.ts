import Tools from './Tools'
import ProcessModel from './ProcessModel'
import { ProcessSpec } from './ProcessModel'
import DocumentModel from './DocumentModel'
import { Template, Link } from './Template'

export default class GroupModel {
  public id: number
  
  public parent: GroupModel
  public doc: DocumentModel
  
  public type: string
  public title: string
  public ports: { input: string[], output: string[] }
  
  public groups: GroupModel[]
  public processes: ProcessModel[]
  public links: Link[]
  
  public x: number
  public y: number
  public width: number
  public height: number
  public selected: boolean
  public collapsed: boolean
  
  constructor(obj, parent: GroupModel, doc: DocumentModel) {
    this.groups = [];
    this.processes = [];
    this.links = [];
    this.parent = parent;
    this.doc = doc;

    for (var key in obj) {
      this[key] = obj[key];
    }

    this.groups.forEach((g, index) => this.groups[index] = new GroupModel(g, this, doc));
    this.processes.forEach((p: any, index) => this.processes[index] = new ProcessModel(p, Tools.processes[p.type], this));
  }

  /**
   * Key for React.
   */
  getKey(): string {
    return (this.parent ? this.parent.getKey() : '') + this.type + this.id;
  }

  getTitle(): string {
    return this.title || this.type
  }

  getPorts(): { input: string[], output: string[] } {
    return this.ports
  }

  getMaxId(): number {
    var gmax = Math.max.apply(null, this.groups.map(g => g.id));
    var pmax = Math.max.apply(null, this.processes.map(p => p.id));
    return Math.max.apply(null, [this.id, gmax, pmax]);
  }

  addGroup(group) {
    var g = new GroupModel(group, this, this.doc);

    g.links.forEach(l => {
      if (!l.from.id) l.from.id = group.id;
      if (!l.to.id) l.to.id = group.id;
    });

    this.groups.push(g);
  }

  addProcess(p: ProcessSpec) {
    let template: Template = Tools.processes[p.type]
    this.processes.push(new ProcessModel(p, template, this));
  }

  deleteSelected() {
    // remove selected items
    this.groups.filter(g => g.selected).slice().forEach(g => this.deleteGroup(g));
    this.processes.filter(p => p.selected).slice().forEach(p => this.deleteProcess(p));
    this.links.filter(l => l.selected).slice().forEach(l => this.deleteLink(l));
    // if anything is selected in subgroups, delete it as well
    this.groups.forEach(g => g.deleteSelected());
  }

  deleteGroup(group: GroupModel) {
    this.groups.splice(this.groups.indexOf(group), 1);
    this.links.slice().forEach(l => {
      if (l.from.id == group.id || l.to.id == group.id) {
        this.deleteLink(l);
      }
    });
  }

  deleteProcess(process: ProcessModel) {
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
    if (this.collapsed) {
      return this.getCollapsedSize();
    } else {
      return this.getCalculatedSize();
    }
  }

  getCollapsedSize() {
    return { width: 150, height: 50 };
  }

  getCalculatedSize() {
    var size = { width: 0, height: 0 };
    var padding = { x: 20, y: 50 };
    this.groups.forEach(g => {
      var groupSize = g.collapsed ? g.getSize() : g.getCalculatedSize();
      if (g.x + groupSize.width + padding.x > size.width) size.width = g.x + groupSize.width + padding.x;
      if (g.y + groupSize.height + padding.y > size.height) size.height = g.y + groupSize.height + padding.y;
    });
    this.processes.forEach(p => {
      var pSize = p.getSize();
      if (p.x + pSize.width + padding.x > size.width) size.width = p.x + pSize.width + padding.x;
      if (p.y + pSize.height + padding.y > size.height) size.height = p.y + pSize.height + padding.y;
    });
    if (size.width <= 0) size.width = 150;
    if (size.height <= 0) size.height = 50;
    return size;
  }

  getChildById(id) {
    if (this.id == id) return this;
    return this.processes.filter(p => p.id == id)[0] || this.groups.filter(g => g.id == id)[0];
  }

  getLinkInput(link): { process: ProcessModel, outPort: string, inPort: string } {
    if (link.from) {
      // the link connects a port on this group to a process in the group
      if (link.from.id == this.id) {
        return this.parent.getLinkInput({ to: link.from, inPort: link.to.port });
      // the link connects a process in this group to another group in process in this group
      } else { 
        // the link connects a process in this group to another process in this group
        var process = this.processes.filter(p => p.id == link.from.id)[0];
        if (process) return { process: process, outPort: link.from.port, inPort: link.inPort || link.to.port };
        // the link connects a process in this group to another group in this group
        var group = this.groups.filter(g => g.id == link.from.id)[0];
        if (group) return group.getLinkInput({ to: link.from });
      }
    } else if (link.to) {
      var linkTo = this.links.filter(l => l.to.id == link.to.id && l.to.port == link.to.port)[0];
      if (linkTo) return this.getLinkInput({ from: linkTo.from, to: linkTo.to, inPort: link.inPort });
    }
  }

  resolveLinkOutput(from) {
    var links = this.links
      .filter(l => l.from.id == from.id && l.from.port == from.port)
      .map(l => this.getChildById(l.to.id));

    return [].concat.apply([], links);
  }

  getStatus(): string {
    if (this.processes.filter(p => p.getStatus() == 'error').length > 0) return 'error';
    if (this.processes.filter(p => p.getStatus() == 'running').length > 0) return 'running';
    if (this.processes.filter(p => p.getStatus() == 'canceled').length > 0) return 'canceled';
    if (this.processes.filter(p => p.getStatus() == 'pending').length == this.processes.length) return 'pending';
    if (this.processes.filter(p => p.getStatus() == 'finished').length == this.processes.length) return 'finished';
  }
  
  isValid(): boolean {
    return this.processes.filter(p => p.isValid() === false).length === 0;
  }
  
  getAllProcesses(): ProcessModel[] {
    let proceses = [];
    
    for (let process of this.processes) {
      proceses.push(process);
    }
    
    for (let group of this.groups) {
      proceses = proceses.concat(group.getAllProcesses());
    }
    
    return proceses;
  }
}
