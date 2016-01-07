import React from 'react'

export default React.createClass({
  onChange: function(process, key, value) {
    Actions.paramChanged(process, key, value);
  },

  render: function() {
    var selected;
    selected = selected || this.props.graph.groups.filter(g => g.selected)[0];
    selected = selected || this.props.graph.processes.filter(p => p.selected)[0];

    var body;
    if (!selected || !selected.params) {
      body = <div>Nothing selected</div>;
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
      body = <table><tbody>{children}</tbody></table>;
    }

    return (
      <div>
        <h2>Properties</h2>
        {body}
      </div>
    );
  }
});
