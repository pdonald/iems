import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import Block from './block'
import Actions from '../actions'

export default class Properties extends React.Component<any, any> {
  /* shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  } */
  
  onChange(process, key, value) {
    Actions.paramChanged(process, key, value);
  }

  render() {
    var selected;
    selected = selected || this.props.graph.groups.filter(g => g.selected)[0];
    selected = selected || this.props.graph.processes.filter(p => p.selected)[0];

    var heading, body;
    if (!selected || !selected.params) {
      let props = {};
      for (let key in this.props.doc.props) props[key] = this.props.doc.props[key];
      for (let key in this.props.doc.tags) if (!props.hasOwnProperty(key)) props[key] = this.props.doc.tags[key];
      var children = Object.keys(props).map(key => {
        return (
          <tr key={key}>
          <th>{key}</th>
          <td><input type="text" value={props[key]} onChange={e => this.onChange(this.props.doc, key, (e.target as HTMLInputElement).value)}/></td>
          </tr>
        )
      });
      heading = 'Experiment Properties';
      body = <table><tbody>{children}</tbody></table>;
    } else {
      var p = selected;
      var children = Object.keys(p.template.params).map(key => {
        return (
          <tr key={key}>
          <th>{key}</th>
          <td><input type="text" value={p.params[key]} onChange={e => this.onChange(p, key, (e.target as HTMLInputElement).value)}/></td>
          </tr>
        )
      });
      heading = p.template.title + ' Properties';
      body = <table><tbody>{children}</tbody></table>;
    }

    return (
      <Block name="properties" title={heading}>
        {body}
      </Block>
    );
  }
}