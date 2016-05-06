import * as React from 'react'
//import PureRenderMixin from 'react-addons-pure-render-mixin'

export default class Draggable extends React.Component<any, any> {
  //mixins: [PureRenderMixin],
  
  constructor(props) {
    super(props);
    
    props.pos = props.pos || { x: 0, y: 0 };
    props.onMove = props.onMove || function() {};
    props.onClick = props.onClick || function() {};
    
    this.state = {
      dragging: false,
      moved: false,
      pos: { x: this.props.pos.x, y: this.props.pos.y },
      rel: null // position relative to the cursor
    };
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
      this.props.onClick(e);
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
    this.props.onMove(pos);
    e.stopPropagation();
    e.preventDefault();
  }

  render() {
    return (
      <g {...this.props}
          transform={`translate(${this.props.pos.x},${this.props.pos.y})`}
          onClick={this.onClick}
          onMouseDown={this.onMouseDown}
          onMove={this.props.onMove} />
    );
  }
}
