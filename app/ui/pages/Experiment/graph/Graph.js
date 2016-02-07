import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

import Select from './Select'

export default React.createClass({
  mixins: [PureRenderMixin],

  getInitialState: function() {
    return { parentHeight: null };
  },

  componentDidMount: function() {
    window.addEventListener('resize', this.calculateContainerSize);
    this.calculateContainerSize();
  },

  componentWillUnmount: function() {
    window.removeEventListener('resize', this.calculateContainerSize);
  },

  calculateContainerSize: function() {
    this.setState({ parentHeight: this.refs.svg.parentNode.clientHeight });
  },

  render: function() {
    var size = this.props.graph.getCalculatedSize();
    var style = {
      minWidth: (size.width+25)+'px',
      minHeight: Math.max(size.height+100, this.state.parentHeight-5)+'px'
    };
    return (
      <svg style={style} ref="svg">
        <Select width={size.width+25} height={size.height+100}>
          {this.props.children}
        </Select>
      </svg>
    );
  }
});
