import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import GroupModel from '../../../../universal/experiment/GroupModel'
import ProcessModel from '../../../../universal/experiment/ProcessModel'

import Process from './process'
import Connector from './connector'

export default class Group extends React.Component<Props, {}> {
  /* shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  } */

  getPortPosition(obj, portName, dir, self) {
    let size = obj.getSize()

    let x = self ? 0 : obj.x
    let y = self ? 0 : obj.y
    if (self) dir = dir == 'input' ? 'output' : 'input'

    let ports = obj.getPorts()

    x += (ports[dir].indexOf(portName)+1) * (size.width / (ports[dir].length + 1))
    y += dir == 'output' ? size.height : 0
    y += (dir == 'output' ? 10 : -10) * (self ? - 1 : 1)

    return { x: x, y: y }
  }

  render() {
    let group = this.props.group

    if (this.props.blank) {
      let groups = group.groups.map(g => <Group key={g.getKey()} group={g} />)

      let processes = group.processes.map(p => {
        let size = p.getSize()
        return <Process width={size.width} height={size.height} x={p.x} y={p.y}
                        graph={p} title={p.getTitle()} key={p.getKey()} selected={p.selected}
                        ports={p.getPorts()} status={p.getStatus()} />
      })

      let links = this.renderLinks(group)

      let size = group.getCalculatedSize()
      let isMain = group.id == 0

      return (
        <Process width={size.width} height={size.height}
                 x={isMain ? 0 : 20} y={isMain ? 0 : 50}
                 graph={group} ports={group.ports || { input:[], output: [] }}
                 blank={true} main={isMain}>
          {groups}
          {processes}
          {links}
        </Process>
      )
    } else {
      let size = group.getCollapsedSize()
      return (
        <Process width={size.width} height={size.height} x={group.x} y={group.y}
                 title={group.getTitle()} graph={group} selected={group.selected}
                 ports={group.ports} status={group.getStatus()}>
        </Process>
      )
    }
  }
  
  renderLinks(group: GroupModel) {
    return group.links.map(l => {
      let sourcep = group.getChildById(l.from.id)
      let targetp = group.getChildById(l.to.id)
      if (!sourcep || !targetp) return
      if (sourcep.id != group.id && sourcep.getPorts().output.indexOf(l.from.port) === -1) return
      if (targetp.id != group.id && targetp.getPorts().input.indexOf(l.to.port) === -1) return
      let source = this.getPortPosition(sourcep, l.from.port, 'output', l.from.id == group.id)
      let target = this.getPortPosition(targetp, l.to.port, 'input', l.to.id == group.id)
      let from = group.getLinkInput(l)
      let to = group.getChildById(l.to.id)

      if (to instanceof GroupModel) {
        from = null
        to = null
      }

      return <Connector key={group.getKey()+'/'+l.from.id+'/'+l.from.port+'/'+l.to.id+'/'+l.to.port}
        selected={l.selected} graph={l}
        source={source} target={target}
        sourceType={from ? from.process.template.output[from.outPort] : null}
        targetType={to ? (to as ProcessModel).template.input[l.to.port] : null}/>
    })
  }
}

interface Props {
  group: GroupModel
  blank?: boolean
}