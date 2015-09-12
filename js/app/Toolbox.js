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

  render: function() {
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
              <li key={cat + '/' + p.type}
                draggable="true"
                onDragStart={(e) => this.dragStart(e, p)}
                onDragEnd={this.dragEnd}>
                {p.title || p.type}
              </li>
            ))}
          </ul>
        </div>
      ));

    return (
      <div>
        <h2>Toolbox</h2>
        {children}
      </div>
    );
  }
});
