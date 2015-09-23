var Process = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  getDefaultProps: function () {
    return { ports: { input: [], output: [] }, draggable: true, x: 0, y: 0 };
  },

  onMove: function(pos) {
    Actions.move(pos, this.props.graph, this.props.parent);
  },

  goIntoGroup: function(e) {
    Actions.goIntoGroup(this.props.graph);
    e.preventDefault();
    e.stopPropagation();
  },

  portName: function(process, type, port) {
    if (process.template) {
      var portinfo = process.getPortsInfo()[type][port];
      if (portinfo.title) {
        return portinfo.title(process, process.getParamValues());
      }
    }
    return port;
  },

  render: function() {
    var width = this.props.width;
    var height = this.props.height;

    var ports = this.props.ports;
    var offset = {
      x: width / (ports.input.length+1),
      y: width / (ports.output.length+1)
    };

    var classes = ['process'];
    if (this.props.blank) classes.push('blank');
    if (this.props.main) classes.push('main');
    if (this.props.selected) classes.push('selected');
    if (this.props.status) classes.push(this.props.status);

    var padding = 10;
    var min = { x: padding, y: padding };

    var resize;
    if (!this.props.blank) {
      /* resize = (
        <g>
          <rect className="resize" style={{cursor: "nw-resize"}} x={0} y={0} width={10} height={10}/>
          <rect className="resize" style={{cursor: "ne-resize"}} x={width-10} y={0} width={10} height={10}/>
          <rect className="resize" style={{cursor: "sw-resize"}} x={0} y={height-10} width={10} height={10}/>
          <rect className="resize" style={{cursor: "se-resize"}} x={width-10} y={height-10} width={10} height={10}/>
        </g>
      ); */
    }

    return (
      <Draggable className={classes.join(' ')}
                 pos={{x: this.props.x, y: this.props.y}} min={min}
                 onMove={this.onMove}>
        <g className={this.props.graph.collapsed?'zoom-in':''}>
          <rect className="process-rect" x={0} y={0} width={width} height={height} onDoubleClick={this.goIntoGroup}/>
          <text x="10" y="30" onDoubleClick={this.goIntoGroup}>{this.props.title}</text>
          {resize}
          <g>{ports.input.map((port, index) => <Port process={this.props.graph} group={this.props.group} key={port} port={port} label={this.portName(this.props.graph, 'input', port)} type="input" x={(index+1)*offset.x} y={0}/>)}</g>
          <g>{ports.output.map((port, index) => <Port process={this.props.graph} group={this.props.group} key={port} port={port} label={this.portName(this.props.graph, 'output', port)} type="output" x={(index+1)*offset.y} y={height}/>)}</g>
        </g>
        <g>
          {this.props.children}
        </g>
      </Draggable>
    );
  }
});
