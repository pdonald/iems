import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

import ProcessModel from 'universal/experiment/ProcessModel'

export default React.createClass({
  mixins: [PureRenderMixin],

  onClick: function() {
    Actions.selectManual(this.props.graph);
  },

  checkTypes: function() {
    if (this.props.sourceType && this.props.targetType) {
      if (!ProcessModel.isLinkValid(this.props.sourceType, this.props.targetType)) {
        // todo
        var stype = (this.props.sourceType || {}).type || this.props.sourceType || '';
        var ttype = (this.props.targetType || {}).type || this.props.targetType || '';

        var midx = (this.props.source.x+this.props.target.x)/2 - stype.length*3;
        var midy = (this.props.source.y+this.props.target.y)/2;

        var msg = (
          <g>
            <rect x={midx-10} y={midy-20} width={Math.max(stype.length,ttype.length)*8} height={50}></rect>
            <text x={midx} y={midy}>{stype}</text>
            <text x={midx} y={midy+20}>{ttype}</text>
          </g>
        );

        if (Math.abs(this.props.source.y - this.props.target.y) < 50) msg = <g/>;

        return msg;
      }
    }
  },

  render: function() {
    var msg = this.checkTypes();

    var classes = ['connector'];
    if (this.props.selected) classes.push('selected');
    if (msg) classes.push('incompatible-types');

    return (
      <g className={classes.join(' ')} onClick={this.onClick}>
        <line x1={this.props.source.x} y1={this.props.source.y}
              x2={this.props.target.x} y2={this.props.target.y} />
        {msg}
      </g>
    );
  }
});
