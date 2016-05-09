import * as React from 'react'
//import PureRenderMixin from 'react-addons-pure-render-mixin'

import Select from './Select'

export default class Graph extends React.Component<any, any> {
  //mixins: [PureRenderMixin],

  constructor(props) {
    super(props);
    this.state = { parentHeight: null }; 
  }

  componentDidMount() {
    window.addEventListener('resize', this.calculateContainerSize);
    this.calculateContainerSize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.calculateContainerSize);
  }

  calculateContainerSize() {
    this.setState({ parentHeight: this.refs.svg.parentNode.clientHeight });
  }

  render() {
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
}