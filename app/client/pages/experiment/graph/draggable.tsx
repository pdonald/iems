import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

export default class Draggable extends React.Component<Props, any> {
  constructor(props) {
    super(props);
    
    this.state = {
      dragging: false,
      moved: false,
      pos: { x: this.props.pos.x, y: this.props.pos.y },
      rel: null // position relative to the cursor
    };
  }
  
  shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  }

  componentDidUpdate(props, state) {
    if (this.state.dragging && !state.dragging) {
      document.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
    } else if (!this.state.dragging && state.dragging) {
      document.removeEventListener('mousemove', this.onMouseMove.bind(this));
      document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  onClick(e) {
    // handled by onMouseUp
  }

  onMouseDown(e) {
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
  }

  onMouseUp(e) {
    if (!this.state.moved) {
      if (this.props.onClick) this.props.onClick(e);
    }
    this.setState({ dragging: false, moved: false });
    e.stopPropagation();
    e.preventDefault();
  }

  onMouseMove(e) {
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
    if (this.props.onMove) this.props.onMove(pos);
    e.stopPropagation();
    e.preventDefault();
  }

  render() {
    return (
      <g className={this.props.className}
         transform={`translate(${this.props.pos.x},${this.props.pos.y})`}
         onClick={e => this.onClick(e)}
         onMouseDown={e => this.onMouseDown(e)}
         onMove={e => this.props.onMove && this.props.onMove(e)}>
         
         {this.props.children}
         
      </g>
    );
  }
}

interface Props {
  className?: string;
  children?: any;
  pos: { x: number, y: number };
  min?: { x: number, y: number };
  max?: { x: number, y: number };
  onClick?: (e) => void;
  onMove?: (e) => void;
}
