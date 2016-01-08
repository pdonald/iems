import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

import Select from './Select'

export default React.createClass({
  mixins: [PureRenderMixin],

  render: function() {
    var size = this.props.graph.getCalculatedSize();
    var style = {
      minWidth: (size.width+25)+'px',
      minHeight: (size.height+100)+'px'
    };
    return (
      <svg style={style}>
        <Select width={size.width+25} height={size.height+100}>
          {this.props.children}
        </Select>
      </svg>
    );
  }
});
