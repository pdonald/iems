import React from 'react'

import Actions from './Actions'

export default React.createClass({
  onChange: function(process, key, value) {
    Actions.paramChanged(process, key, value);
  },

  render: function() {
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
          <td><input type="text" value={props[key]} onChange={e => this.onChange(this.props.doc, key, e.target.value)}/></td>
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
          <td><input type="text" value={p.params[key]} onChange={e => this.onChange(p, key, e.target.value)}/></td>
          </tr>
        )
      });
      heading = p.template.title + ' Properties';
      body = <table><tbody>{children}</tbody></table>;
    }

    return (
      <div>
        <h2>{heading}</h2>
        {body}
      </div>
    );
  }
});
