var Graph = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  render: function() {
    var size = this.props.graph.getCalculatedSize();
    return (
      <svg style={{width: (size.width+25)+'px', height: (size.height+100)+'px'}}>
        <Select width={size.width+25} height={size.height+100}>
          {this.props.children}
        </Select>
      </svg>
    );
  }
});
