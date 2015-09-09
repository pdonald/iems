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
            ports: { in: ['src', 'trg'], out: ['algn'] },
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
              { from: { id: 603, port: 'out' }, to: { id: 6, port: 'algn' } },
            ]
          }
        ],
        processes: [
          { id: 1, name: 'opus', params: { corpus: 'EUconst', srcLang: 'en', trgLang: 'lv' }, x: 20, y: 50, width: 150, height: 50 },
          { id: 2, name: 'tokenizer', params: { lang: 'en' }, x: 20, y: 200, width: 150, height: 50 },
          { id: 3, name: 'kenlm', params: { order: 5 }, x: 800, y: 300, width: 150, height: 50 },
          { id: 4, name: 'binlm', params: { type: 'trie' }, x: 800, y: 450, width: 150, height: 50 },
          { id: 5, name: 'tokenizer', params: { lang: 'lv' }, x: 180, y: 200, width: 150, height: 50 },
          { id: 7, name: 'phrases', params: { model: 'wbe-msd', maxLength: 7 }, x: 250, y: 750, width: 150, height: 50 },
          { id: 8, name: 'reordering', params: { type: 'wbe', orientation: 'msd', model: 'wbe-msd-bidirectional-fe', smoothing: 0.5 }, x: 350, y: 850, width: 150, height: 50 },
          { id: 11, name: 'reorderingbin', params: {}, x: 350, y: 1000, width: 150, height: 50 },
          { id: 9, name: 'lexical', params: {}, x: 50, y: 700, width: 150, height: 50 },
          { id: 10, name: 'phrasescore', params: {}, x: 50, y: 900, width: 250, height: 50 },
          { id: 12, name: 'phrasesbin', params: {}, x: 50, y: 1050, width: 150, height: 50 },
          { id: 13, name: 'moses', params: {}, x: 50, y: 1400, width: 250, height: 50 },
          { id: 18, name: 'detokenizer', params: { lang: 'en' }, x: 150, y: 1550, width: 150, height: 50 },
          { id: 14, name: 'echo', params: { text: 'hello world.' }, x: 350, y: 1175, width: 150, height: 50 },
          { id: 15, name: 'tokenizer', params: { lang: 'en' }, x: 250, y: 1300, width: 150, height: 50 },
          { id: 16, name: 'bleu', params: { case: false }, x: 350, y: 1700, width: 150, height: 50 },
          { id: 17, name: 'echo', params: { text: 'sveika, pasaule.' }, x: 550, y: 1175, width: 150, height: 50 },
        ],
        links: [
          { from: { id: 1, port: 'src' }, to: { id: 2, port: 'in' } },
          { from: { id: 5, port: 'out' }, to: { id: 3, port: 'in' } },
          { from: { id: 1, port: 'trg' }, to: { id: 5, port: 'in' } },
          { from: { id: 2, port: 'out' }, to: { id: 6, port: 'src' } },
          { from: { id: 5, port: 'out' }, to: { id: 6, port: 'trg' } },
          { from: { id: 2, port: 'out' }, to: { id: 7, port: 'src' } },
          { from: { id: 5, port: 'out' }, to: { id: 7, port: 'trg' } },
          { from: { id: 6, port: 'algn' }, to: { id: 7, port: 'algn' } },
          { from: { id: 3, port: 'out' }, to: { id: 4, port: 'in' } },
          { from: { id: 7, port: 'o' }, to: { id: 8, port: 'phr' } },
          { from: { id: 2, port: 'out' }, to: { id: 9, port: 'src' } },
          { from: { id: 5, port: 'out' }, to: { id: 9, port: 'trg' } },
          { from: { id: 6, port: 'algn' }, to: { id: 9, port: 'algn' } },
          { from: { id: 7, port: 'out' }, to: { id: 10, port: 'phr' } },
          { from: { id: 7, port: 'inv' }, to: { id: 10, port: 'phrinv' } },
          { from: { id: 9, port: 'srctrg' }, to: { id: 10, port: 'srctrg' } },
          { from: { id: 9, port: 'trgsrc' }, to: { id: 10, port: 'trgsrc' } },
          { from: { id: 8, port: 'reord' }, to: { id: 11, port: 'reord' } },
          { from: { id: 10, port: 'ptable' }, to: { id: 12, port: 'ptable' } },
          { from: { id: 12, port: 'minphr' }, to: { id: 13, port: 'phr' } },
          { from: { id: 4, port: 'out' }, to: { id: 13, port: 'lm' } },
          { from: { id: 14, port: 'out' }, to: { id: 15, port: 'in' } },
          { from: { id: 15, port: 'out' }, to: { id: 13, port: 'in' } },
          { from: { id: 17, port: 'out' }, to: { id: 16, port: 'ref' } },
          { from: { id: 14, port: 'out' }, to: { id: 16, port: 'src' } },
          { from: { id: 13, port: 'out' }, to: { id: 18, port: 'in' } },
          { from: { id: 18, port: 'out' }, to: { id: 16, port: 'trans' } },
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
