var Toolbox = React.createClass({
  getDefaultProps: function () {
    return { onAdd: () => {} };
  },

  render: function() {
    return (
      <div>
        <h2>Toolbox</h2>
        <ul>
          {Object.keys(processes).map((key) => (
            <li key={key} onClick={() => this.props.onAdd(processes[key])}>
              {processes[key].name}
            </li>
          ))}
        </ul>
      </div>
    );
  }
});

var Properties = React.createClass({
  render: function() {
    if (this.props.selectedIndex === null) {
      return <div className="properties"><h2>Properties</h2></div>
    }

    var component = this.props.components[this.props.selectedIndex];

    return (
      <div className="properties">
        <h2>Properties of {component.template.name}</h2>
        <ul>
        {Object.keys(component.template.params).map((key) => (
          <li key={key}>{key}: <input defaultValue={component.params[key]} onChange={(e) => this.props.onChange(key, e.target.value)}/></li>
        ))}
        </ul>
      </div>
    );
  }
});
