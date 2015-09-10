var App = React.createClass({
  getInitialState: function() {
    return {
      output: 'makefile',
      last: 1000,
      graph: new GroupX({
        id: 0,
        x: 0, y: 0,
        groups: [],
        processes: [
          { id: 1, name: 'opus', params: { corpus: 'EUconst', srcLang: 'en', trgLang: 'lv' }, x: 20, y: 50, width: 150, height: 50 },
          { id: 2, name: 'tokenizer', params: { lang: 'en' }, x: 20, y: 200, width: 150, height: 50 },
          { id: 5, name: 'tokenizer', params: { lang: 'lv' }, x: 180, y: 200, width: 150, height: 50 },
          { id: 14, name: 'echo', title: 'echo source', params: { text: 'European Parlament.' }, x: 220, y: 50, width: 150, height: 50 },
          { id: 17, name: 'echo', title: 'echo reference', params: { text: 'Eiropas Parlaments.' }, x: 440, y: 50, width: 150, height: 50 },
          { id: 20, name: 'moses-ini', params: {}, x: 50, y: 500, width: 250, height: 50 },
        ],
        links: [
          { from: { id: 1, port: 'src' }, to: { id: 2, port: 'in' } },
          { from: { id: 1, port: 'trg' }, to: { id: 5, port: 'in' } },
        ]
      })
    }
  },

  mixins: [Reflux.ListenerMixin],

  componentDidMount: function() {
     this.listenTo(moveAction, this.onMove);
     this.listenTo(Actions.add, this.onAdd);
     this.listenTo(deleteAction, this.onDelete);
     this.listenTo(selectAction, this.onSelect);
     this.listenTo(connectAction, this.onConnect);
     this.listenTo(portSelectedAction, p => this.selectedPort = p);
     this.listenTo(portDeselectedAction, p => this.selectedPort = null);
     this.listenTo(paramChangedAction, this.onParamChanged);

     this.clipboard = new ZeroClipboard(this.refs.copyMakefileButton.getDOMNode());
   },

  onParamChanged: function(process, key, value) {
    process[key] = value;
    this.setState({ graph: this.state.graph });
  },

  onMove: function(pos, graph, parent) {
     graph.x = pos.x;
     graph.y = pos.y;
     //console.log(parent)
     /*if (!parent) {

     } else {
       if (parent.groups.indexOf(graph)) {
       }
       if (parent.processes.indexOf(graph) != -1) {
         console.log('te')
         var update = {};
         update[parent.processes.indexOf(graph)] = { x: { $set: pos.x }, y: { $set: pos.y } };
         parent.processes = React.addons.update(parent.processes, update);
       }

     } */
     this.setState({ graph: this.state.graph });
     //this.forceUpdate();
     //console.log(graph.id, pos.x, pos.y)
  },

  onAdd: function(template, x, y) {
    var offset = this.refs.graph.getDOMNode().getBoundingClientRect();
    if (x >= offset.left && x <= offset.right && y >= offset.top && y <= offset.bottom) {
      if (template.id) {
        var group = new GroupX(JSON.parse(JSON.stringify(template)));
        group.id = this.state.last;
        group.x = x - offset.left;
        group.y = y - offset.top;
        //var size = group.getCalculatedSize();
        group.width = 150;
        group.height = 50;
        this.state.graph.addGroup(group);
      } else {
        this.state.graph.addProcess({
          id: this.state.last,
          x: x - offset.left, y: y - offset.top,
          width: 150, height: 50,
          name: template.name, type: template.name, params: {}
        });
      }
      this.setState({ last: this.state.last+1, graph: this.state.graph })
    }
  },

  onSelect: function(obj) {
    //console.log(obj)
    //obj.selected = !obj.selected;
    //this.setState({ graph: this.state.graph })
    if (obj.getSize) {
      this.setState({ graph: obj })
    }
  },

  onDelete: function() {
    this.state.graph.deleteSelected();
    this.setState({ graph: this.state.graph });
  },

  onConnect: function(from, to) {
    if (from && this.selectedPort) {
      // validate connection
      //this.state.graph.getContainerFor(from.id).links.push({ from: from, to: this.selectedPort });
      this.state.graph.links.push({ from: from, to: this.selectedPort });
      this.setState({ graph: this.state.graph })
    }
  },

  changeOutputType: function(type) {
    this.setState({ output: type });
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
                  <div className="cell">
                    <div className="cell-scroll-outer" style={{'height': '80%'}}>
                      <div className="cell-scroll-inner grid">
                        <Graph ref="graph" graph={this.state.graph}>
                          <Group blank={true} group={this.state.graph}/>
                        </Graph>
                      </div>
                    </div>
                    <div className="table" style={{'borderTop': '1px solid #000'}}>
                      <div className="row">
                        <div className="cell preview">
                          <button className="copy" ref="copyMakefileButton" data-clipboard-target="makefile">Copy to clipboard</button>
                          <div className="options">
                            <label><input type="radio" name="outtype" checked={this.state.output=='makefile'?'checked':''} onClick={e => this.changeOutputType('makefile')}/> Makefile</label>
                            <label><input type="radio" name="outtype" checked={this.state.output=='json'?'checked':''} onClick={e => this.changeOutputType('json')}/> JSON</label>
                          </div>
                          <pre id="makefile">
                            {(this.state.output == 'makefile' ? genMakefile(this.state.graph) : JSON.stringify(this.state.graph, null, 2)) + '\n\n\n\n'}
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
