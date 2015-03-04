var Draggable = React.createClass({
  getDefaultProps: function () {
    return { x: 0, y: 0 };
  },

  getInitialState: function () {
    return {
      pos: { x: this.props.x, y: this.props.y },
      dragging: false,
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

  onMouseDown: function (e) {
    if (e.button !== 0) return; // only left mouse button
    this.setState({
      dragging: true,
      rel: {
        x: e.pageX - this.props.x,
        y: e.pageY - this.props.y
      }
    });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseUp: function (e) {
    this.setState({ dragging: false });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseMove: function (e) {
    if (!this.state.dragging) return;
    var pos = {
      x: e.pageX - this.state.rel.x,
      y: e.pageY - this.state.rel.y
    };
    this.setState({ pos: pos });
    if (this.props.onMove) {
      this.props.onMove(pos);
    }
    e.stopPropagation();
    e.preventDefault();
  },

  render: function () {
    return (
      <g {...this.props}
          transform={`translate(${this.state.pos.x},${this.state.pos.y})`}
          onMouseDown={this.onMouseDown} />
    );
  }
});

var Graph = React.createClass({
  render: function() {
    return <svg {...this.props}>{this.props.children}</svg>;
  }
});

var Connector = React.createClass({
  render: function() {
    return (
      <g className="connector">
        <line x1={this.props.source.x} y1={this.props.source.y}
              x2={this.props.target.x} y2={this.props.target.y} />
      </g>
    );
  }
});

var Port = React.createClass({
  getInitialState: function () {
    return {
      pos: { x: this.props.x, y: this.props.y },
      dragging: false,
      rel: null
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

  onMouseDown: function (e) {
    if (e.button !== 0) return; // only left mouse button
    this.setState({
      dragging: true,
      rel: {
        x: e.pageX - +this.props.x,
        y: e.pageY - +this.props.y
      }
    });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseUp: function (e) {
    this.setState({ dragging: false });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseMove: function (e) {
    if (!this.state.dragging) return;
    var pos = {
      x: e.pageX - this.state.rel.x,
      y: e.pageY - this.state.rel.y
    };
    this.setState({ pos: pos });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseOver: function(e) {
    this.setState({ on: true });
  },

  onMouseOut: function(e) {
    this.setState({ on: false });
  },

  render: function() {
    var line = null;
    if (this.state.dragging) {
      line = <line x1={this.props.x} y1={this.props.y}
                   x2={this.state.pos.x} y2={this.state.pos.y} className="port-line"/>;
    }

    var fill = this.state.on ? "yellow" : "red";

    return (
      <g className={`port port-${this.props.type}`}>
        <text x={+this.props.x-(this.props.label.length*2)} y={+this.props.y+(this.props.type == 'in' ? -20 : 30)}>{this.props.label}</text>
        <circle cx={this.props.x} cy={this.props.y} r="10" fill={fill}
                onMouseDown={this.onMouseDown}
                onMouseOver={this.onMouseOver}
                onMouseOut={this.onMouseOut} />
        {line}
      </g>
    );
  }
});

var Group = React.createClass({
  /* getSize: function(group) {
    var width = 150;
    var height = 50;

    if (group.processes) {
      group.processes.forEach(p => {
        width = Math.max(width, p.x + p.width);
        height = Math.max(height, p.y + p.height);
      });

      if (group.processes.length > 1) {
        width += 20;
        height += 50;
      }
    }

    if (group.groups) {
      group.groups.forEach(g => {
        var size = this.getSize(g);
        width = Math.max(width, size.width);
        height = Math.max(height, size.height);
      });
    }

    return { width: width, height: height };
  }, */

  getPortPos: function(obj, portName, dir, self) {
    var x = self ? 0 : obj.x;
    var y = self ? 0 : obj.y;
    if (self) dir = dir == 'in' ? 'out' : 'in';

    x += (obj.ports[dir].indexOf(portName)+1) * (obj.width / (obj.ports[dir].length + 1));
    y += dir == 'out' ? obj.height : 0;
    y += (dir == 'out' ? 10 : -10) * (self ? - 1 : 1);

    return { x: x, y: y };
  },

  render: function() {
    var group = this.props.group;
    var groups, processes, links;

    if (group.groups) {
      groups = group.groups.map(g => <Group group={g}/>);
    }

    if (group.processes) {
      processes = group.processes.map(p => {
        return <Process width={p.width} height={p.height} x={p.x} y={p.y}
                        name={p.name} ports={p.ports} />;
      });
    }

    if (group.links) {
      var ids = {};
      ids[group.id] = group;
      if (group.groups) group.groups.forEach(g => ids[g.id] = g)
      if (group.processes) group.processes.forEach(p => ids[p.id] = p)

      links = group.links.map(l => {
        var source = this.getPortPos(ids[l.from.id], l.from.port, 'out', l.from.id == group.id);
        var target = this.getPortPos(ids[l.to.id], l.to.port, 'in', l.to.id == group.id);
        return <Connector source={source} target={target}/>;
      });
    }

    if (this.props.blank) {
      return (
        <g>
          {groups}
          {processes}
          {links}
        </g>
      );
    } else {
      return (
        <Process width={group.width} height={group.height} name={group.name} ports={group.ports}
                 x={group.x} y={group.y}>
          {groups}
          {processes}
          {links}
        </Process>
      );
    }
  }
});

var Process = React.createClass({
  getDefaultProps: function () {
    return { ports: { in: [], out: [] } };
  },

  render: function() {
    var ports = this.props.ports;
    var offset = {
      x: this.props.width / (ports.in.length+1),
      y: this.props.width / (ports.out.length+1)
    };
    return (
      <Draggable className="process" x={this.props.x} y={this.props.y} onMove={this.props.onMove}>
        <g>
          <rect x="0" y="0" width={this.props.width} height={this.props.height}/>
          <text x="10" y="30">{this.props.name}</text>
          <g>{ports.in.map((port, index) => <Port key={port} label={port} type="in" x={(index+1)*offset.x} y={0}/>)}</g>
          <g>{ports.out.map((port, index) => <Port key={port} label={port} type="out" x={(index+1)*offset.y} y={this.props.height}/>)}</g>
        </g>
        <g>
          {this.props.children}
        </g>
      </Draggable>
    );
  }
});
