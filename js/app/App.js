var App = React.createClass({
  getInitialState: function() {
    /*return {
      last: 1000,
      id: 0,
      x: 10, y: 10,
      groups: [],
      links: [],
      processes: []
    } */
    return {
      last: 1000,
      graph: new GroupX({
        id: 0,
        x: 0, y: 0,
        groups: [
          {
            id: 6,
            x: 350, y: 350, width: 400, height: 300,
            ports: { in: ['src', 'trg'], out: ['alignments'] },
            processes: [
              { id: 601, name: 'fastalign', x: 20, y: 50, width: 150, height: 50 },
              { id: 602, name: 'fastalign', params: { reverse: true }, x: 200, y: 50, width: 150, height: 50 },
              { id: 603, name: 'sym', params: { method: 'grow-diag-final-and' }, x: 120, y: 200, width: 150, height: 50 },
            ],
            links: [
              { from: { id: 6, port: 'src' }, to: { id: 601, port: 'src' } },
              { from: { id: 6, port: 'trg' }, to: { id: 602, port: 'trg' } },
              { from: { id: 6, port: 'src' }, to: { id: 602, port: 'src' } },
              { from: { id: 6, port: 'trg' }, to: { id: 601, port: 'trg' } },
              { from: { id: 601, port: 'out' }, to: { id: 603, port: 'srctrg' } },
              { from: { id: 602, port: 'out' }, to: { id: 603, port: 'trgsrc' } },
              { from: { id: 603, port: 'out' }, to: { id: 6, port: 'alignments' } },
            ]
          }
        ],
        processes: [
          { id: 1, name: 'opus', params: { corpus: 'EUconst', srcLang: 'en', trgLang: 'lv' }, x: 20, y: 50, width: 150, height: 50 },
          { id: 2, name: 'tokenizer', params: { lang: 'en' }, x: 20, y: 200, width: 150, height: 50 },
          { id: 3, name: 'kenlm', params: { order: 5 }, x: 800, y: 300, width: 150, height: 50 },
          { id: 4, name: 'binlm', params: { type: 'trie' }, x: 800, y: 450, width: 150, height: 50 },
          { id: 5, name: 'tokenizer', params: { lang: 'lv' }, x: 180, y: 200, width: 150, height: 50 },
          { id: 7, name: 'phrases', params: { model: 'wbe-msd', maxLength: 7 }, x: 180, y: 700, width: 150, height: 50 },
        ],
        links: [
          { from: { id: 1, port: 'src' }, to: { id: 2, port: 'in' } },
          { from: { id: 5, port: 'out' }, to: { id: 3, port: 'in' } },
          { from: { id: 1, port: 'trg' }, to: { id: 5, port: 'in' } },
          { from: { id: 2, port: 'out' }, to: { id: 6, port: 'src' } },
          { from: { id: 5, port: 'out' }, to: { id: 6, port: 'trg' } },
          { from: { id: 2, port: 'out' }, to: { id: 7, port: 'src' } },
          { from: { id: 5, port: 'out' }, to: { id: 7, port: 'trg' } },
          { from: { id: 6, port: 'alignments' }, to: { id: 7, port: 'alignments' } },
          { from: { id: 3, port: 'out' }, to: { id: 4, port: 'in' } },
        ]
      })
    }
  },

  mixins: [Reflux.ListenerMixin],

  componentDidMount: function() {
     this.listenTo(moveAction, this.onMove);
     this.listenTo(addAction, this.onAdd);
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

  onAdd: function(process, x, y) {
    var offset = this.refs.graph.getDOMNode().getBoundingClientRect();
    if (x >= offset.left && x <= offset.right && y >= offset.top && y <= offset.bottom) {
      this.state.graph.processes.push({
        id: this.state.last, name: process,
        x: x - offset.left, y: y - offset.top,
        width: 150, height: 50
      });
      this.setState({ last: this.state.last+1, graph: this.state.graph })
    }
  },

  onSelect: function(obj) {
    obj.selected = !obj.selected;
    this.setState({ graph: this.state.graph })
  },

  onDelete: function() {
    this.state.graph.deleteSelected();
    this.setState({ graph: this.state.graph });
  },

  onConnect: function(from, to) {
    if (from && this.selectedPort) {
      // validate connection
      this.state.graph.links.push({ from: from, to: this.selectedPort });
      this.setState({ graph: this.state.graph })
    }
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
                        <div className="cell toolbox" style={{'height': '1px'}}>
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
                          <button className="copy" ref="copyMakefileButton" data-clipboard-target="makefile">Copy Makefile</button>
                          <pre id="makefile">{genMakefile(this.state.graph)}</pre>
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
