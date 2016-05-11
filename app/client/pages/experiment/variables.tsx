import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import Actions from './actions'

export default class Variables extends React.Component<any, any> {
  /* shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  } */

  onChange(key, value) {
    Actions.variableChanged(key, value);
  }

  onAdd() {
    let keyElement = this.refs['key'] as HTMLInputElement;
    let valueElement = this.refs['value'] as HTMLInputElement;
    let varName = keyElement.value
    if (!varName.length) return
    if (varName[0] == '$') varName = varName.substr(1) // remove accidental $
    this.onChange(varName, valueElement.value);
    keyElement.value = valueElement.value = '';
  }

  onEnter(e) {
    if (e.keyCode == 13) {
      this.onAdd();
    }
  }

  render() {
    var children = Object.keys(this.props.vars)
      .map(key => (
        <tr key={key}>
        <th>{key}</th>
        <td><input type="text" value={this.props.vars[key]} onChange={(e) => this.onChange(key, (e.target as HTMLInputElement).value)}/></td>
        </tr>
      ));

    return (
      <div>
        <h2>Variables</h2>
        <table>
        <tbody>
          {children}
          <tr>
            <th><input type="text" ref="key" onKeyUp={this.onEnter} /></th>
            <td><input type="text" ref="value" onKeyUp={this.onEnter}/></td>
          </tr>
        </tbody>
        </table>
      </div>
    );
  }
}