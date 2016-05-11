import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import ProcessModel from 'universal/experiment/ProcessModel'
import Actions from '../actions'

export default class Connector extends React.Component<Props, any> {
  shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  }
  
  onClick() {
    Actions.selectManual(this.props.graph);
  }

  checkTypes() {
    if (this.props.sourceType && this.props.targetType) {
      if (!ProcessModel.isLinkValid(this.props.sourceType, this.props.targetType)) {
        // todo
        var stype = (this.props.sourceType || { type: null }).type || this.props.sourceType || '';
        var ttype = (this.props.targetType || { type: null }).type || this.props.targetType || '';

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
  }

  render() {
    var msg = this.checkTypes();

    var classes = ['connector'];
    if (this.props.selected) classes.push('selected');
    if (msg) classes.push('incompatible-types');

    return (
      <g className={classes.join(' ')} onClick={this.onClick.bind(this)}>
        <line x1={this.props.source.x} y1={this.props.source.y}
              x2={this.props.target.x} y2={this.props.target.y} />
        {msg}
      </g>
    );
  }
}

interface Props {
  graph: any;
  selected: boolean;
  source: { x: number; y: number };
  target: { x: number; y: number };
  sourceType?: { type: string; length: number };
  targetType?: { type: string; length: number; };
}
