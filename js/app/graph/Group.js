var Group = React.createClass({
  //mixins: [React.addons.PureRenderMixin],

  onClick: function() {
    Action.select(this.props.group);
  },

  getPortPos: function(obj, portName, dir, self) {
    var width = obj.width;
    var height = obj.height;
    if (obj.getSize) {
      var size = obj.collapsed ? obj.getSize() : obj.getCalculatedSize();
      width = size.width;
      height = size.height;
    }

    var x = self ? 0 : obj.x;
    var y = self ? 0 : obj.y;
    if (self) dir = dir == 'in' ? 'out' : 'in';

    var ports = obj.ports;
    if (!ports) {
      ports = {
        in: Object.keys(Tools.processes[obj.name].input),
        out: Object.keys(Tools.processes[obj.name].output)
      }
    }

    x += (ports[dir].indexOf(portName)+1) * (width / (ports[dir].length + 1));
    y += dir == 'out' ? height : 0;
    y += (dir == 'out' ? 10 : -10) * (self ? - 1 : 1);

    return { x: x, y: y };
  },

  render: function() {
    var group = this.props.group;
    var groups, processez, links;

    if (group.groups) {
      groups = group.groups.map(g => <Group key={group.id+'/'+g.id} group={g} status={this.props.status}/>);
    }

    if (group.processes) {
      processez = group.processes.map(p => {
        var id = p.name + '-g' + group.id + 'p' + p.id;
        var status;
        if (this.props.status) status = this.props.status[id];
        var ports = { in: Object.keys(Tools.processes[p.name].input), out: Object.keys(Tools.processes[p.name].output) }
        var name = p.name;
        if (p.title) name = p.title;
        if (Tools.processes[p.name].title) name = Tools.processes[p.name].title;
        if (Tools.processes[p.name].toTitle) name = Tools.processes[p.name].toTitle(p);
        return <Process width={p.width} height={p.height} x={p.x} y={p.y}
                        name={name} ports={ports} graph={p} id={p.id} key={group.id+'/'+p.id}
                        selected={p.selected} status={status} />;
      });
    }

    if (group.links) {
      var ids = {};
      ids[group.id] = group;
      if (group.groups) group.groups.forEach(g => ids[g.id] = g)
      if (group.processes) group.processes.forEach(p => ids[p.id] = p)

      links = group.links.map(l => {
        var source = this.getPortPos(ids[l.from.id], l.from.port, 'out', l.from.id == group.id);
        var target = this.getPortPos(ids[l.to.id], l.to.port, 'in', l.to.id == group.id);
        return <Connector key={group.id+'/'+l.from.id+'/'+l.from.port+'/'+l.to.id+'/'+l.to.port} source={source} target={target} graph={l}/>;
      });
    }

    var gstatus = group.getStatus(this.props.status);

    if (this.props.blank) {
      var size = group.getCalculatedSize();
      return (
        <Process width={size.width} height={size.height} name={group.title || group.name} ports={group.ports}
                 graph={group} id={group.id} blank={true} x={group.id == 0 ? 0 : 20} y={group.id == 0 ? 0 : 50} status={gstatus}>
          {groups}
          {processez}
          {links}
        </Process>
      );
    } else {
      return (
        <Process width={group.width} height={group.height} name={group.title || group.name} ports={group.ports}
                 x={group.x} y={group.y} graph={group} id={group.id} selected={group.selected} status={gstatus}>
        </Process>
      );
    }
  }
});
