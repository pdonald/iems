var Properties = React.createClass({
  mixins: [Reflux.ListenerMixin],

  getInitialState: function() {
    return { selected: [], params: null };
  },

  componentDidMount: function() {
     this.listenTo(selectAction, this.onSelect);
   },

  onSelect: function(obj) {
     var index = this.state.selected.indexOf(obj);
     if (index == -1) {
       this.state.selected.push(obj);
       this.state.params = obj.params;
     } else {
       this.state.selected.splice(index, 1);
     }
     this.setState(this.state);
   },

   onChange: function(process, key, value) {
     this.state.params[key] = value;
     this.setState(this.state);
     paramChangedAction(process, key, value);
   },

  render: function() {
    var body;
    if (this.state.selected.length == 0) {
      body = <div>Nothing selected</div>;
    } else if (this.state.selected.length == 1) {
      var p = this.state.selected[0];
      var children = Object.keys(this.state.params).map(key => {
        return (
          <p key={key}>{key}: <input type="text" value={p.params[key]} onChange={(e) => this.onChange(p, key, e.target.value)}/></p>
        )
      });
      body = <div>{children}</div>;
    } else {
      body = <div>Too many selected: {this.state.selected.length}</div>;
    }
    return (
      <div>
        <h2>Properties</h2>
        {body}
      </div>
    );
  }
});
