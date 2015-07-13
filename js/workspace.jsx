var Toolbox = React.createClass({
  getInitialState: function() {
    return { dragging: null };
  },

  dragStart: function(e, key) {
    this.setState({ dragging: key });
  },

  dragEnd: function(e) {
    if (this.state.dragging) {
      addAction(this.state.dragging, e.pageX, e.pageY)
      this.setState({ dragging: null });
    }
  },

  render: function() {
    return (
      <div>
        <h2>Toolbox</h2>
        <ul>
          {Object.keys(processes).map((key) => (
            <li key={key}
              draggable="true"
              onDragStart={(e) => this.dragStart(e, key)}
              onDragEnd={this.dragEnd}>
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
