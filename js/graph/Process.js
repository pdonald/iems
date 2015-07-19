var Process = React.createClass({
  getDefaultProps: function () {
    return { ports: { in: [], out: [] } };
  },

  mixins: [React.addons.PureRenderMixin],

  onMove: function(pos) {
    moveAction(this.props.graph, pos);
  },

  onClick: function() {
    selectAction(this.props.graph);
  },

  render: function() {
    var ports = this.props.ports;
    var offset = {
      x: this.props.width / (ports.in.length+1),
      y: this.props.width / (ports.out.length+1)
    };
    var classes = ['process'];
    if (this.props.selected) classes.push('selected');

    var min, max;
    if (this.props.parent) {
      var padding = 10;
      min = { x: padding, y: padding};
      max = {
        x: this.props.parent.width - this.props.width - padding,
        y: this.props.parent.height - this.props.height - padding
      };
    }

    return (
      <Draggable className={classes.join(' ')}
                 pos={{x: this.props.x, y: this.props.y}} min={min} max={max}
                 onMove={this.onMove} onClick={this.onClick}>
        <g>
          <rect x="0" y="0" width={this.props.width} height={this.props.height}/>
          <text x="10" y="30">{this.props.name}</text>
          <g>{ports.in.map((port, index) => <Port process={this.props.id} key={port} label={port} type="in" x={(index+1)*offset.x} y={0}/>)}</g>
          <g>{ports.out.map((port, index) => <Port process={this.props.id} key={port} label={port} type="out" x={(index+1)*offset.y} y={this.props.height}/>)}</g>
        </g>
        <g>
          {this.props.children}
        </g>
      </Draggable>
    );
  }
});
