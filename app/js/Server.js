var Server = React.createClass({
  mixins: [React.addons.PureRenderMixin, Reflux.ListenerMixin],

  getInitialState: function () {
    return { url: null, interval: 1000, timer: null }
  },

  componentDidMount: function() {
    this.listenTo(Actions.runExperiment, this.launch);

    this.setState({ url: document.location.href });
  },

  launch: function(doc, resume) {
    var data = {
      workdir: doc.vars.workdir,
      makefile: Output.Makefile(doc.stack[0]),
      resume: !!resume
    };

    var request = {
      type: 'POST',
      url: this.state.url.replace(/\/+$/, '') + '/run',
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: res => console.log(res)
    };

    $.ajax(request);
  },

  startOrStop: function() {
    if (this.state.timer) {
      clearInterval(this.state.timer);
      this.setState({ timer: null });
    } else {
      var doc = this.props.doc;
      var url = this.state.url.replace(/\/+$/, '');
      var workdir = this.props.doc.vars.workdir;
      var check = function() {
        $.get(url + '/status?workdir=' + encodeURI(workdir), result => {
          Actions.updateStatus(doc, result);
        });
      };

      check();
      this.setState({ timer: setInterval(check, this.state.interval) });
    }
  },

  render: function() {
    return (
      <div>
        <h2>Server</h2>
        <table>
        <tbody>
          <tr>
            <th>URL</th>
            <td><input type="text" value={this.state.url} onChange={e => this.setState({ url: e.target.value })}/></td>
          </tr>
          <tr>
            <th>Update interval</th>
            <td><input type="text" value={this.state.interval} onChange={e => this.setState({ interval: e.target.value })}/></td>
          </tr>
          <tr>
            <td colSpan="2"><button onClick={this.startOrStop}>{!this.state.timer?'Start':'Stop'}</button></td>
          </tr>
        </tbody>
        </table>
      </div>
    );
  }
});
