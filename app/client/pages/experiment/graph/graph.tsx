import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import Select from './select'

export default class Graph extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.state = { parentHeight: null };
    this.calculateContainerSize = this.calculateContainerSize.bind(this); 
  }
  
  shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  }

  componentDidMount() {
    window.addEventListener('resize', this.calculateContainerSize);
    this.calculateContainerSize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.calculateContainerSize);
  }

  calculateContainerSize() {
    let svgRef = this.refs['svg'] as SVGElement;
    this.setState({ parentHeight: svgRef.parentElement.clientHeight });
  }

  render() {
    let size = this.props.graph.getCalculatedSize();
    let style = {
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
}