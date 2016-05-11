import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'
import * as jQuery from 'jquery'

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
};

export default class Toolbox extends React.Component<any, any> {
  constructor(props) {
    super(props)
    
    this.state = { dragging: null }
    
    this.dragStart = this.dragStart.bind(this)
    this.drag = this.drag.bind(this)
    this.dragEnd = this.dragEnd.bind(this)
  }

  componentWillMount() {
    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('mouseup', this.dragEnd);
  }
  
  shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  }

  dragStart(e, obj) {
    var $dragdiv = jQuery(`<div class="dragobj">${obj.title || obj.type}</div>`).appendTo('body');

    this.setState({
      dragging: obj,
      $dragdiv: $dragdiv,
    });

    document.addEventListener('mousemove', this.drag);
    document.addEventListener('mouseup', this.dragEnd);
  }

  drag(e) {
    this.state.$dragdiv.offset({ left: e.pageX-20, top: e.pageY-20 })
  }

  dragEnd(e) {
    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('mouseup', this.dragEnd);

    if (this.state.dragging) {
      this.state.$dragdiv.remove();
      Actions.add(this.state.dragging, e.pageX-20, e.pageY-20)
      this.setState({ dragging: null });
    }
  }

  render() {
    var all = [];
    for (var i in Tools.processes) all.push(Tools.processes[i]);
    for (var i in Tools.groups) all.push(Tools.groups[i]);

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
      ));

    return (
      <Block name="toolbox" title="Toolbox">
        {children}
      </Block>
    );
  }
}
