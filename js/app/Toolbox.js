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

  displayItemGroup: function(item) {
    if (item.group) return item.group;
    return 'undefined';
  },

  render: function() {
    var all = [];
    for (var i in Tools.processes) all.push(Tools.processes[i]);
    for (var i in Tools.blocks) all.push(Tools.blocks[i]);

    var groups = all
      .map(p => p.group)
      .filter((g, i, arr) => arr.lastIndexOf(g) === i)
      .map(group => (
        <div key={group} className="toolbox-group">
          <h3>{GroupNames[group] || group}</h3>
          <ul>
            {all.filter(p => p.group == group).map(p => (
              <li key={p.name}
                draggable="true"
                onDragStart={(e) => this.dragStart(e, p)}
                onDragEnd={this.dragEnd}>
                {this.displayItemName(p)}
              </li>
            ))}
          </ul>
        </div>
      ));

    return (
      <div>
        <h2>Toolbox</h2>
        {groups}
      </div>
    );
  }
});
