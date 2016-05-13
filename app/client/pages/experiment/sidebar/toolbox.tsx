import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import Tools from '../../../../universal/experiment/Tools'
import Actions from '../actions'
import Block from './block'

var CategoryTitles = {
  'lm': 'Language models',
  'alignment': 'Word alignment',
  'decoder': 'Decoding',
  'corpora': 'Corpora tools',
  'evaluation': 'Evaluation',
  'phrases': 'Phrase based tools',
  'tuning': 'Tuning'
}

export default class Toolbox extends React.Component<any, State> {
  constructor(props) {
    super(props)
    
    this.state = { dragging: null, dragdiv: null }
    
    this.dragStart = this.dragStart.bind(this)
    this.drag = this.drag.bind(this)
    this.dragEnd = this.dragEnd.bind(this)
  }

  componentWillMount() {
    document.removeEventListener('mousemove', this.drag)
    document.removeEventListener('mouseup', this.dragEnd)
  }
  
  shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments)
  }

  dragStart(e, obj) {
    var dragdiv = document.createElement('div')
    dragdiv.classList.add('dragobj')
    dragdiv.textContent = obj.title || obj.type
    dragdiv.style.position = 'absolute'
    document.body.appendChild(dragdiv)

    this.setState({
      dragging: obj,
      dragdiv: dragdiv,
    })

    document.addEventListener('mousemove', this.drag)
    document.addEventListener('mouseup', this.dragEnd)
  }

  drag(e) {
    this.state.dragdiv.style.left = (e.pageX - 20) + 'px'
    this.state.dragdiv.style.top = (e.pageY - 20) + 'px'
  }

  dragEnd(e) {
    document.removeEventListener('mousemove', this.drag)
    document.removeEventListener('mouseup', this.dragEnd)

    if (this.state.dragging) {
      this.state.dragdiv.parentNode.removeChild(this.state.dragdiv)
      Actions.add(this.state.dragging, e.pageX-20, e.pageY-20)
      this.setState({ dragging: null })
    }
  }

  render() {
    var all = []
    for (var i in Tools.processes) all.push(Tools.processes[i])
    for (var i in Tools.groups) all.push(Tools.groups[i])

    var children = all
      .map(p => p.category)
      .filter((g, i, arr) => arr.lastIndexOf(g) === i)
      .map(cat => (
        <div key={cat} className="toolbox-group">
          <h3>{CategoryTitles[cat] || cat}</h3>
          <ul>
            {all.filter(p => p.category == cat).map(p => (
              <li key={cat + '/' + p.type} onMouseDown={e => this.dragStart(e, p)}>
                {p.title || p.type}
              </li>
            ))}
          </ul>
        </div>
      ))

    return (
      <Block name="toolbox" title="Toolbox">
        {children}
      </Block>
    )
  }
}

interface State {
  dragging: boolean
  dragdiv?: HTMLElement
}