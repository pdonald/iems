import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import Actions from '../actions'

export default class Port extends React.Component<Props, any> {
  constructor(props) {
    super(props);
    
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
    
    this.state = {
      pos: { x: this.props.x, y: this.props.y },
      dragging: false,
      rel: null
    }; 
  }
  
  shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  }

  componentDidUpdate(props, state) {
    if (this.state.dragging && !state.dragging) {
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    } else if (!this.state.dragging && state.dragging) {
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    }
  }

  onMouseDown(e) {
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
  }

  onMouseUp(e) {
    this.setState({ dragging: false });
    e.stopPropagation();
    e.preventDefault();
    Actions.connect({ id: this.props.process.id, port: this.props.port })
  }

  onMouseMove(e) {
    if (!this.state.dragging) return;
    var pos = {
      x: e.pageX - this.state.rel.x,
      y: e.pageY - this.state.rel.y
    };
    this.setState({ pos: pos });
    e.stopPropagation();
    e.preventDefault();
  }

  onMouseOver(e) {
    this.setState({ on: true });
    Actions.portSelected({ id: this.props.process.id, port: this.props.port })
  }

  onMouseOut(e) {
    this.setState({ on: false });
    Actions.portDeselected({ id: this.props.process.id, port: this.props.port })
  }

  onDoubleClick(e) {
    Actions.viewFile(this.props);
  }

  render() {
    var line = null;

    if (this.state.dragging) {
      line = <line x1={this.props.x} y1={this.props.y}
                   x2={this.state.pos.x} y2={this.state.pos.y} className="port-line"/>;
    }

    return (
      <g className={`port port-${this.props.type} ${this.state.on ? 'port-on' : ''}`}>
        <text x={+this.props.x-(this.props.label.length*2)} y={+this.props.y+(this.props.type == 'input' ? -20 : 30)}>{this.props.label}</text>
        <circle cx={this.props.x} cy={this.props.y} r="10"
                onMouseDown={this.onMouseDown}
                onMouseOver={this.onMouseOver}
                onMouseOut={this.onMouseOut}
                onDoubleClick={this.onDoubleClick} />
        {line}
      </g>
    );
  }
}

interface Props {
  x: number;
  y: number;
  port: string;
  type: string;
  label: string;
  process: any;
}