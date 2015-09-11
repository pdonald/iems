var App = React.createClass({
  getInitialState: function() {
    return {
      output: 'makefile',
      last: 1400,
      stack: [
        new GroupX(AppDefaultGraph)
      ]
    }
  },

  mixins: [Reflux.ListenerMixin],

  componentDidMount: function() {
     this.listenTo(Actions.move, this.onMove);
     this.listenTo(Actions.add, this.onAdd);
     this.listenTo(Actions.delete, this.onDelete);
     this.listenTo(Actions.select, this.onSelect);
     this.listenTo(Actions.goIntoGroup, this.onGoIntoGroup);
     this.listenTo(Actions.connect, this.onConnect);
     this.listenTo(Actions.portSelected, p => this.selectedPort = p);
     this.listenTo(Actions.portDeselected, p => this.selectedPort = null);
     this.listenTo(Actions.paramChanged, this.onParamChanged);

     this.clipboard = new ZeroClipboard(this.refs.copyMakefileButton);
   },

  onParamChanged: function(process, key, value) {
    process[key] = value;
    this.setState({ stack: this.state.stack });
  },

  onMove: function(pos, graph, parent) {
     graph.x = pos.x;
     graph.y = pos.y;
     this.setState({ stack: this.state.stack });
  },

  onAdd: function(template, x, y) {
    var offset = ReactDOM.findDOMNode(this.refs.graph).getBoundingClientRect();
    if (x >= offset.left && x <= offset.right && y >= offset.top && y <= offset.bottom) {
      if (template.id) {
        var group = new GroupX(JSON.parse(JSON.stringify(template)));
        group.id = this.state.last;
        group.x = x - offset.left;
        group.y = y - offset.top;
        //var size = group.getCalculatedSize();
        group.width = 150;
        group.height = 50;
        group.collapsed = true;
        this.currentGraph().addGroup(group);
      } else {
        this.currentGraph().addProcess({
          id: this.state.last,
          x: x - offset.left, y: y - offset.top,
          width: template.width || 150, height: template.height || 50,
          name: template.name, type: template.name, params: {}
        });
      }
      this.setState({ last: this.state.last+1, stack: this.state.stack })
    }
  },

  onSelect: function(obj) {
    obj.selected = !obj.selected;
    this.setState({ stack: this.state.stack })
  },

  onGoIntoGroup: function(obj) {
    // prevents double click bugs
    if (obj == this.state.stack[0]) return;
    if (obj == this.state.stack[this.state.stack.length-1]) return;

    if (obj.getSize) {
      obj.collapsed = false;
      this.state.stack.push(obj);
      this.setState({ stack: this.state.stack })
    }
  },

  onDelete: function() {
    this.currentGraph().deleteSelected();
    this.setState({ stack: this.state.stack });
  },

  onConnect: function(from, to) {
    if (from && this.selectedPort) {
      // validate connection
      this.currentGraph().links.push({ from: from, to: this.selectedPort });
      this.setState({ stack: this.state.stack })
    }
  },

  changeOutputType: function(type) {
    this.setState({ output: type });
  },

  currentGraph: function() {
    return this.state.stack[this.state.stack.length-1];
  },

  goTo: function(index) {
    while (this.state.stack.length-1 != index) {
      var graph = this.state.stack.pop();
      graph.collapsed = true;
    }
    this.currentGraph().collapsed = false;
    this.setState({ stack: this.state.stack })
  },

  render: function() {
    return (
      <div className="container">
        <div className="table">
          <div className="row header-row">
            <div className="cell header-cell">
              <h1>Interactive Experiment Management System</h1>
            </div>
          </div>
          <div className="row">
            <div className="cell">
              <div className="table">
                <div className="row">
                  <div className="cell" style={{'borderRight': '1px solid #000000', 'width': '300px', 'height': '100%'}}>
                    <div className="cell-scroll-outer" style={{'height': '100%'}}>
                      <div className="cell-scroll-inner">
                        <div className="table sidebar">
                          <div className="row">
                            <div className="cell toolbox">
                              <Toolbox/>
                            </div>
                          </div>
                          <div className="row">
                            <div className="cell properties">
                              <Properties/>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="cell">
                    <nav className="depth">
                      <ul>
                        {this.state.stack.map((g, index) => <li key={index} onClick={() => this.goTo(index)}>{(g.title || g.name || '#'+g.id)}</li>)}
                      </ul>
                    </nav>
                    <div className="cell-scroll-outer" style={{'height': '80%'}}>
                      <div className="cell-scroll-inner grid">
                        <Graph ref="graph" graph={this.currentGraph()}>
                          <Group blank={true} group={this.currentGraph()}/>
                        </Graph>
                      </div>
                    </div>
                    <div className="table" style={{'borderTop': '1px solid #000'}}>
                      <div className="row">
                        <div className="cell preview">
                          <button className="copy" ref="copyMakefileButton" data-clipboard-target="makefile">Copy to clipboard</button>
                          <div className="options">
                            <label><input type="radio" readOnly name="outtype" checked={this.state.output=='makefile'?'checked':''} onClick={e => this.changeOutputType('makefile')}/> Makefile</label>
                            <label><input type="radio" readOnly name="outtype" checked={this.state.output=='json'?'checked':''} onClick={e => this.changeOutputType('json')}/> JSON</label>
                          </div>
                          <pre id="makefile">
                            {(this.state.output == 'makefile' ? genMakefile(this.currentGraph(), this.state.stack[0]) : JSON.stringify(this.currentGraph(), null, 2)) + '\n\n\n\n'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
});
