import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import GroupModel from 'universal/experiment/GroupModel'
import Process from './Process'
import Connector from './Connector'

export default class Group extends React.Component<any, any> {
  /* shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  } */

  getPortPosition(obj, portName, dir, self) {
    var size = obj.getSize();

    var x = self ? 0 : obj.x;
    var y = self ? 0 : obj.y;
    if (self) dir = dir == 'input' ? 'output' : 'input';

    var ports = obj.getPorts();

    x += (ports[dir].indexOf(portName)+1) * (size.width / (ports[dir].length + 1));
    y += dir == 'output' ? size.height : 0;
    y += (dir == 'output' ? 10 : -10) * (self ? - 1 : 1);

    return { x: x, y: y };
  }

  render() {
    var group = this.props.group;

    if (this.props.blank) {
      var groups = group.groups.map(g => <Group key={g.getKey()} group={g} />);

      var processes = group.processes.map(p => {
        var size = p.getSize();
        return <Process width={size.width} height={size.height} x={p.x} y={p.y}
                        graph={p} title={p.getTitle()} key={p.getKey()} selected={p.selected}
                        ports={p.getPorts()} status={p.getStatus()} />;
      });

      var links = group.links.map(l => {
        var sourcep = group.getChildById(l.from.id);
        var targetp = group.getChildById(l.to.id);
        if (!sourcep || !targetp) return;
        if (sourcep.id != group.id && sourcep.getPorts().output.indexOf(l.from.port) === -1) return;
        if (targetp.id != group.id && targetp.getPorts().input.indexOf(l.to.port) === -1) return;
        var source = this.getPortPosition(sourcep, l.from.port, 'output', l.from.id == group.id);
        var target = this.getPortPosition(targetp, l.to.port, 'input', l.to.id == group.id);
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
                 graph={group} ports={group.ports || { input:[], output: [] }}
                 blank={true} main={group.id == 0}>
          {groups}
          {processes}
          {links}
        </Process>
      );
    } else {
      var size = group.getCollapsedSize();
      return (
        <Process width={size.width} height={size.height} x={group.x} y={group.y}
                 title={group.getTitle()} graph={group} selected={group.selected}
                 ports={group.ports} status={group.getStatus()}>
        </Process>
      );
    }
  }
}