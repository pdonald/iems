var Graph = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  render: function() {
    var size = this.props.graph.getCalculatedSize();
    var style = {
      width: '100%', minWidth: (size.width+25)+'px',
      height: '100%', minHeight: (size.height+100)+'px'
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
