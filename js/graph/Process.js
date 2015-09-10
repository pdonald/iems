var Process = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  getDefaultProps: function () {
    return { ports: { in: [], out: [] }, draggable: true, x: 0, y: 0 };
  },

  onMove: function(pos) {
    moveAction(pos, this.props.graph, this.props.parent);
  },

  onClick: function() {
    selectAction(this.props.graph);
  },

  portName: function(process, type, port) {
    var tpl = Tools.processes[process.name];
    if (tpl && tpl[type]) {
      var portinfo = tpl[type][port];
      if (portinfo.title) {
        return portinfo.title(process);
      }
    }
    return port;
  },

  render: function() {
    var width = this.props.width;
    var height = this.props.height;

    var ports = this.props.ports;
    var offset = {
      x: width / (ports.in.length+1),
      y: width / (ports.out.length+1)
    };
    var classes = ['process'];
    if (this.props.blank) classes.push('blank');
    if (this.props.selected) classes.push('selected');

    var min, max;
    if (this.props.parent) {
      var padding = 10;
      min = { x: padding, y: padding};
      max = {
        x: this.props.parent.width - width - padding,
        y: this.props.parent.height - height - padding
      };
    }

    return (
      <Draggable className={classes.join(' ')}
                 pos={{x: this.props.x, y: this.props.y}} min={min} max={max}
                 onMove={this.onMove} onClick={this.onClick}>
        <g>
          <rect x="0" y="0" width={width} height={height}/>
          <text x="10" y="30">{this.props.name}</text>
          <g>{ports.in.map((port, index) => <Port process={this.props.id} key={port} label={this.portName(this.props.graph, 'input', port)} type="in" x={(index+1)*offset.x} y={0}/>)}</g>
          <g>{ports.out.map((port, index) => <Port process={this.props.id} key={port} label={this.portName(this.props.graph, 'output', port)} type="out" x={(index+1)*offset.y} y={height}/>)}</g>
        </g>
        <g>
          {this.props.children}
        </g>
      </Draggable>
    );
  }
});
