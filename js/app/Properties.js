var Properties = React.createClass({
  mixins: [Reflux.ListenerMixin],

  getInitialState: function() {
    return { selected: null };
  },

  componentDidMount: function() {
     this.listenTo(selectAction, this.onSelect);
   },

  onSelect: function(obj) {
    this.setState({ selected: obj });
   },

   onChange: function(process, key, value) {
     this.state.selected.params[key] = value;
     this.setState(this.state);
     paramChangedAction(process, key, value);
   },

  render: function() {
    var body;
    if (!this.state.selected) {
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
      body = <table>{children}</table>;
    }
    return (
      <div>
        <h2>Properties</h2>
        {body}
      </div>
    );
  }
});
