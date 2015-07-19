var Toolbox = React.createClass({
  getInitialState: function() {
    return { dragging: null };
  },

  dragStart: function(e, key) {
    // todo: set image
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
