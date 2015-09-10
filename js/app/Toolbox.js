var Toolbox = React.createClass({
  getInitialState: function() {
    return { dragging: null };
  },

  dragStart: function(e, obj) {
    // todo: set image
    this.setState({ dragging: obj });
  },

  dragEnd: function(e) {
    if (this.state.dragging) {
      Actions.add(this.state.dragging, e.pageX, e.pageY)
      this.setState({ dragging: null });
    }
  },

  displayItemName: function(item) {
    if (item.title) return item.title;
    if (item.name) return item.name;
    return 'undefined';
  },

  render: function() {
    return (
      <div>
        <h2>Toolbox</h2>
        <ul>
          {Object.keys(Tools.processes).map(key => (
            <li key={key}
              draggable="true"
              onDragStart={(e) => this.dragStart(e, Tools.processes[key])}
              onDragEnd={this.dragEnd}>
              {this.displayItemName(Tools.processes[key])}
            </li>
          ))}
          {Object.keys(Tools.blocks).map(key => (
            <li key={key}
              draggable="true"
              onDragStart={(e) => this.dragStart(e, Tools.blocks[key])}
              onDragEnd={this.dragEnd}>
              {this.displayItemName(Tools.blocks[key])}
            </li>
          ))}
        </ul>
      </div>
    );
  }
});
