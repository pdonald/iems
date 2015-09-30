var Toolbox = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  getInitialState: function() {
    return {
      dragging: null,
      x: 0, y: 0
    };
  },

  componentWillMount: function() {
    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('mouseup', this.dragEnd);
  },

  dragStart: function(e, obj) {
    var $dragdiv = $(`<div class="dragobj">${obj.title || obj.type}</div>`).appendTo('body');

    this.setState({
      dragging: obj,
      $dragdiv: $dragdiv,
    });

    document.addEventListener('mousemove', this.drag);
    document.addEventListener('mouseup', this.dragEnd);
  },

  drag: function(e) {
    this.state.$dragdiv.offset({ left: e.pageX-20, top: e.pageY-20 })
  },

  dragEnd: function(e) {
    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('mouseup', this.dragEnd);

    if (this.state.dragging) {
      this.state.$dragdiv.remove();
      Actions.add(this.state.dragging, e.pageX-20, e.pageY-20)
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
              <li key={cat + '/' + p.type} onMouseDown={e => this.dragStart(e, p)}>
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
