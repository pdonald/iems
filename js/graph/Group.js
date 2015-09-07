var Group = React.createClass({
  //mixins: [React.addons.PureRenderMixin],

  onClick: function() {
    selectAction(this.props.group);
  },

  getPortPos: function(obj, portName, dir, self) {
    var x = self ? 0 : obj.x;
    var y = self ? 0 : obj.y;
    if (self) dir = dir == 'in' ? 'out' : 'in';

    var ports = obj.ports;
    if (!ports) {
      ports = {
        in: Object.keys(processes[obj.name].input),
        out: Object.keys(processes[obj.name].output)
      }
    }

    x += (ports[dir].indexOf(portName)+1) * (obj.width / (ports[dir].length + 1));
    y += dir == 'out' ? obj.height : 0;
    y += (dir == 'out' ? 10 : -10) * (self ? - 1 : 1);

    return { x: x, y: y };
  },

  render: function() {
    var group = this.props.group;
    var groups, processez, links;

    if (group.groups) {
      groups = group.groups.map(g => <Group key={g.id} group={g}/>);
    }

    if (group.processes) {
      processez = group.processes.map(p => {
        var ports = { in: Object.keys(processes[p.name].input), out: Object.keys(processes[p.name].output) }
        return <Process width={p.width} height={p.height} x={p.x} y={p.y}
                        name={p.name} ports={ports} graph={p} id={p.id} key={p.id}
                        selected={p.selected} parent={group} />;
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
        return <Connector key={l.from.id+l.from.port+l.to.id+l.to.port} source={source} target={target} graph={l}/>;
      });
    }

    if (this.props.blank) {
      return (
        <g>
          {groups}
          {processez}
          {links}
        </g>
      );
    } else {
      return (
        <Process width={group.width} height={group.height} name={group.name} ports={group.ports}
                 x={group.x} y={group.y} graph={group} id={group.id} selected={group.selected}>
          {groups}
          {processez}
          {links}
        </Process>
      );
    }
  }
});
