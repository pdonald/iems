var Connector = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  onClick: function() {
    Actions.select(this.props.graph);
  },

  render: function() {
    var classes = ['connector'];
    if (this.props.graph.selected) classes.push('selected');
    return (
      <g className={classes.join(' ')} onClick={this.onClick}>
        <line x1={this.props.source.x} y1={this.props.source.y}
              x2={this.props.target.x} y2={this.props.target.y} />
      </g>
    );
  }
});
