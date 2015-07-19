var Draggable = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  getDefaultProps: function () {
    return { pos: { x: 0, y: 0 }, min: null, max: null, onMove: function() {} };
  },

  getInitialState: function () {
    return {
      dragging: false,
      moved: false,
      pos: { x: this.props.pos.x, y: this.props.pos.y },
      rel: null // position relative to the cursor
    };
  },

  componentDidUpdate: function (props, state) {
    if (this.state.dragging && !state.dragging) {
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    } else if (!this.state.dragging && state.dragging) {
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    }
  },

  onClick: function(e) {
    // handled by onMouseUp
  },

  onMouseDown: function (e) {
    if (e.button !== 0) return; // only left mouse button
    this.setState({
      dragging: true,
      rel: {
        x: e.pageX - this.props.pos.x,
        y: e.pageY - this.props.pos.y
      }
    });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseUp: function (e) {
    if (!this.state.moved) {
      if (this.props.onClick) {
        this.props.onClick(e);
      }
    }
    this.setState({ dragging: false, moved: false });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseMove: function (e) {
    if (!this.state.dragging) return;
    var pos = {
      x: e.pageX - this.state.rel.x,
      y: e.pageY - this.state.rel.y
    };
    if (this.props.min) {
      if (pos.x < this.props.min.x) pos.x = this.props.min.x;
      if (pos.y < this.props.min.y) pos.y = this.props.min.y;
    }
    if (this.props.max) {
      if (pos.x > this.props.max.x) pos.x = this.props.max.x;
      if (pos.y > this.props.max.y) pos.y = this.props.max.y;
    }
    this.setState({ pos: pos, moved: true });
    this.props.onMove(pos);
    e.stopPropagation();
    e.preventDefault();
  },

  render: function () {
    return (
      <g {...this.props}
          transform={`translate(${this.state.pos.x},${this.state.pos.y})`}
          onClick={this.onClick}
          onMouseDown={this.onMouseDown}
          onMove={this.props.onMove} />
    );
  }
});
