var Properties = React.createClass({
  mixins: [Reflux.ListenerMixin],

  getInitialState: function() {
    return { selected: null };
  },

  componentDidMount: function() {
     this.listenTo(Actions.select, this.onSelect);
   },

  onSelect: function(obj) {
    this.setState({ selected: obj });
   },

   onChange: function(process, key, value) {
     this.state.selected.params[key] = value;
     this.setState(this.state);
     Actions.paramChanged(process, key, value);
   },

  render: function() {
    var body;
    if (!this.state.selected || !this.state.selected.params) {
      body = <div>Nothing selected</div>;
    } else {
      var p = this.state.selected;
      var children = Object.keys(p.params).map(key => {
        return (
          <tr key={key}>
          <th>{key}</th>
          <td><input type="text" value={p.params[key]} onChange={(e) => this.onChange(p, key, e.target.value)}/></td>
          </tr>
        )
      });
      body = <table><tbody>{children}</tbody></table>;
    }
    return (
      <div>
        <h2>Properties</h2>
        {body}
      </div>
    );
  }
});
