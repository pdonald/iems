var Group = React.createClass({
  //mixins: [React.addons.PureRenderMixin],

  getPortPosition: function(obj, portName, dir, self) {
    var width = obj.width;
    var height = obj.height;
    if (obj.getSize) {
      var size = obj.collapsed ? { width: 150, height: 50 } : obj.getCalculatedSize();
      width = size.width;
      height = size.height;
    }

    var x = self ? 0 : obj.x;
    var y = self ? 0 : obj.y;
    if (self) dir = dir == 'in' ? 'out' : 'in';

    var ports = obj.ports;
    if (!ports && obj.template) {
      ports = {
        in: Object.keys(obj.template.input),
        out: Object.keys(obj.template.output)
      }
    }

    x += (ports[dir].indexOf(portName)+1) * (width / (ports[dir].length + 1));
    y += dir == 'out' ? height : 0;
    y += (dir == 'out' ? 10 : -10) * (self ? - 1 : 1);

    return { x: x, y: y };
  },

  render: function() {
    var group = this.props.group;

    if (this.props.blank) {
      var groups = group.groups.map(g => <Group key={g.getKey()} group={g} />);

      var processes = group.processes.map(p => {
        var ports = { in: Object.keys(p.template.input), out: Object.keys(p.template.output) }
        return <Process width={p.width} height={p.height} x={p.x} y={p.y}
                        graph={p} title={p.getTitle()} key={p.getKey()} selected={p.selected}
                        ports={ports} status={p.getStatus()} />;
      });

      var links = group.links.map(l => {
        var source = this.getPortPosition(group.getChildById(l.from.id), l.from.port, 'out', l.from.id == group.id);
        var target = this.getPortPosition(group.getChildById(l.to.id), l.to.port, 'in', l.to.id == group.id);
        var from = group.resolveLinkInput(l);
        var to = group.getChildById(l.to.id);

        //console.log(from,to)
        //if (!(to instanceof GroupModel)) {
          //console.log(from.process.type, from.port, from.process.template.output[from.port], to.type, l.to.port, to.template.input[l.to.port]);

          //console.log(ProcessModel.isLinkValid(from.process.template.output[from.port], to.template.input[l.to.port]))
        //}

        if (to instanceof GroupModel) {
          //console.log(from.process.type, from.port, to.type, l.to.port);
          //console.log(to.resolveLinkOutput(l.to))
          from = null;
          to = null;
        }

        return <Connector key={group.getKey()+'/'+l.from.id+'/'+l.from.port+'/'+l.to.id+'/'+l.to.port}
          selected={l.selected} graph={l}
          source={source} target={target}
          sourceType={from ? from.process.template.output[from.port] : null}
          targetType={to ? to.template.input[l.to.port] : null}/>;
      });

      var size = group.getCalculatedSize();

      return (
        <Process width={size.width} height={size.height}
                 x={group.id == 0 ? 0 : 20} y={group.id == 0 ? 0 : 50}
                 graph={group} ports={group.ports}
                 blank={true} main={group.id == 0}>
          {groups}
          {processes}
          {links}
        </Process>
      );
    } else {
      var size = { width: 150, height: 50 };
      return (
        <Process width={size.width} height={size.height} x={group.x} y={group.y}
                 title={group.getTitle()} graph={group} selected={group.selected}
                 ports={group.ports} status={group.getStatus()}>
        </Process>
      );
    }
  }
});
