var Process = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  getDefaultProps: function () {
    return { ports: { in: [], out: [] } };
  },

  onMove: function(pos) {
    moveAction(pos, this.props.graph, this.props.parent);
  },

  onClick: function() {
    selectAction(this.props.graph);
  },

  portName: function(process, type, port) {
    var tpl = processes[process.name];
    if (tpl) {
      var portinfo = tpl[type][port];
      if (portinfo.title) {
        return portinfo.title(process);
      }
    }
    return port;
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
          <g>{ports.in.map((port, index) => <Port process={this.props.id} key={port} label={this.portName(this.props.graph, 'input', port)} type="in" x={(index+1)*offset.x} y={0}/>)}</g>
          <g>{ports.out.map((port, index) => <Port process={this.props.id} key={port} label={this.portName(this.props.graph, 'output', port)} type="out" x={(index+1)*offset.y} y={this.props.height}/>)}</g>
        </g>
        <g>
          {this.props.children}
        </g>
      </Draggable>
    );
  }
});
