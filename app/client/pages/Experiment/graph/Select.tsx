import * as React from 'react'
//import PureRenderMixin from 'react-addons-pure-render-mixin'

import Actions from '../Actions'

export default class Select extends React.Component<any, any> {
  //mixins: [PureRenderMixin],

  constructor(props) {
    super(props);
    this.state = { dragging: false }; 
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillMount() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
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
    Actions.deselectAll();
    var parent = e.target.getBoundingClientRect();
    var rel = { x: parent.left, y: parent.top };
    var start = { x: e.pageX - rel.x, y: e.pageY - rel.y };
    this.setState({
      dragging: true,
      rel: rel,
      start: start,
      end: start
    });
    e.stopPropagation();
    e.preventDefault();
  }

  onMouseMove(e) {
    if (!this.state.dragging) return;
    this.setState({
      end: {
        x: e.pageX - this.state.rel.x,
        y: e.pageY - this.state.rel.y
      }
    });
    Actions.selectArea({ start: this.state.start, end: this.state.end });
    e.stopPropagation();
    e.preventDefault();
  }

  onMouseUp(e) {
    this.setState({ dragging: false });
    e.stopPropagation();
    e.preventDefault();
  }

  onKeyDown(e) {
    if (e.keyCode == 46) { // delete
      Actions.delete();
    }
  }

  render() {
    // covers the whole graph but is transparent
    // handles mouse events
    // must be first in <g>
    var background =
      <rect className="blank" x={0} y={0} width={this.props.width} height={this.props.height}
            onMouseDown={this.onMouseDown} />

    // if mouse is down then this semi transparent graph covers selected area
    // must be last in <g>
    var selected;
    if (this.state.dragging) {
      var x = Math.min(this.state.start.x, this.state.end.x);
      var y = Math.min(this.state.start.y, this.state.end.y);
      var width = Math.abs(Math.max(20, this.state.start.x) - Math.max(20, this.state.end.x));
      var height = Math.abs(Math.max(20, this.state.start.y) - Math.max(20, this.state.end.y));
      if (x < 20) x = 20;
      if (y < 20) y = 20;
      if (x + width + 20 > this.props.width) width = this.props.width - x - 20;
      if (y + height + 20 > this.props.height) height = this.props.height - y - 20;
      if (width < 0) width = 0;
      if (height < 0) height = 0;
      selected = <rect className="select" x={x} y={y} width={width} height={height}/>;
    }

    return (
      <g>
        {background}
        {this.props.children}
        {selected}
      </g>
    );
  }
}