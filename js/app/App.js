var App = React.createClass({
  getInitialState: function() {
    return {
      output: 'makefile',
      currentDocument: 0,
      modal: {
        open: false,
        title: '',
        content: ''
      },
      documents: [
        {
          name: 'Experiment #1',
          stack: [
            new GroupModel(AppDefaultGraph)
          ]
        },
        {
          name: 'Experiment #2',
          stack: [
            new GroupModel({ id: 0, title: 'Main', x: 0, y: 0 })
          ]
        }
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
     this.listenTo(Actions.viewFile, this.onViewFile);

     this.clipboard = new ZeroClipboard(this.refs.copyMakefileButton);

     //setInterval(() => this.updateStatus(), 1000);
   },

   updateStatus: function() {
     console.log('updating status')
     $.get('/status', result => {
       this.currentDoc().status = result;
       this.setState(this.state);
     });
   },

  onViewFile: function(info) {
    if (info.type != 'out') return;
    if (info.group.id == info.process.id) return;

    var filename = info.process.name + '-g' + info.group.id + 'p' + info.process.id + '.' + info.label;

    this.state.modal.title = filename;
    this.state.modal.open = true;
    this.setState({ modal: this.state.modal });

    $.get('/file?name=' + filename, result => {
      this.state.modal.content = result;
      this.setState({ modal: this.state.modal });
    });
  },

  onParamChanged: function(process, key, value) {
    process[key] = value;
    this.setState(this.state);
  },

  onMove: function(pos, graph, parent) {
     graph.x = pos.x;
     graph.y = pos.y;
     this.setState(this.state);
  },

  onAdd: function(template, x, y) {
    var offset = ReactDOM.findDOMNode(this.refs.graph).getBoundingClientRect();
    if (x >= offset.left && x <= offset.right && y >= offset.top && y <= offset.bottom) {
      var nextid = this.currentGraph().getMaxId() + 1;
      if (!template.toBash) {
        var group = JSON.parse(JSON.stringify(template));
        group.id = nextid;
        group.x = x - offset.left;
        group.y = y - offset.top;
        group.collapsed = true;
        this.currentGraph().addGroup(group);
      } else {
        this.currentGraph().addProcess({
          id: nextid,
          x: x - offset.left, y: y - offset.top,
          width: template.width || 150, height: template.height || 50,
          type: template.type, params: {}
        });
      }
      this.setState(this.state);
    }
  },

  onSelect: function(obj) {
    obj.selected = !obj.selected;
    this.setState(this.state);
  },

  onGoIntoGroup: function(obj) {
    // prevents double click bugs
    if (obj == this.currentDoc().stack[0]) return;
    if (obj == this.currentDoc().stack[this.currentDoc().stack.length-1]) return;

    if (obj.getSize) {
      obj.collapsed = false;
      this.currentDoc().stack.push(obj);
      this.setState(this.state);
    }
  },

  onDelete: function() {
    this.currentGraph().deleteSelected();
    this.setState(this.state);
  },

  onConnect: function(from) {
    if (from && this.selectedPort) {
      if (from.id == this.selectedPort.id && from.port == this.selectedPort.port) return;
      // validate connection
      this.currentGraph().links.push({ from: from, to: this.selectedPort });
      this.setState(this.state);
    }
  },

  changeOutputType: function(type) {
    this.setState({ output: type });
  },

  addDoc: function() {
    var doc = {
      name: 'Experiment #' + (this.state.documents.length+1),
      last: 1,
      stack: [
        new GroupX({ id: 0, title: 'Main', x:0, y:0 })
      ]
    };
    this.state.documents.push(doc);
    this.state.currentDocument = this.state.documents.length - 1;
    this.setState(this.state);
  },

  cloneDoc: function(doc) {
    var clone = JSON.parse(JSON.stringify(doc));
    clone.name += ' (clone)';
    clone.stack = [new GroupX(clone.stack[0])]
    this.state.documents.push(clone);
    this.state.currentDocument = this.state.documents.length - 1;
    this.setState(this.state);
  },

  currentDoc: function() {
    return this.state.documents[this.state.currentDocument];
  },

  goToDoc: function(index) {
    this.state.currentDocument = index;
    this.setState(this.state);
  },

  currentGraph: function() {
    return this.currentDoc().stack[this.currentDoc().stack.length-1];
  },

  goTo: function(index) {
    while (this.currentDoc().stack.length-1 != index) {
      var graph = this.currentDoc().stack.pop();
      graph.collapsed = true;
    }
    this.currentGraph().collapsed = false;
    this.setState(this.state);
  },

  runExp: function() {
    $.ajax({ type: 'POST', url: '/run', data: this.getMakefile(), contentType: 'text/plain' }, res => {
      console.log(res);
    });
  },

  getMakefile: function() {
    return genMakefile(this.currentGraph(), this.currentDoc().stack[0]);
  },

  render: function() {
    return (
      <div className="container">
        <div className={'modal ' + (this.state.modal.open ? 'open' : 'closed')}>
          <div className="modal-header">
            <button onClick={() => this.setState({ modal: { open: false } })}>Close</button>
            <h1>{this.state.modal.title}</h1>
          </div>
          <pre>{this.state.modal.content}</pre>
        </div>
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
                            <div className="cell properties">
                              <Properties/>
                            </div>
                          </div>
                          <div className="row">
                            <div className="cell toolbox">
                              <Toolbox/>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="cell">
                    <nav className="depth">
                      <ul>
                        {this.state.documents.map((doc, index) => <li className={index==this.state.currentDocument?'active':''} key={index} onClick={() => this.goToDoc(index)}>{doc.name}</li>)}
                        <li className="right" onClick={() => this.cloneDoc(this.currentDoc())}>Clone</li>
                        <li className="right" onClick={this.addDoc}>New</li>
                      </ul>
                    </nav>
                    <nav className="depth">
                      <ul>
                        {this.currentDoc().stack.map((g, index) => <li key={index} onClick={() => this.goTo(index)}>{(g.title || g.name || '#'+g.id)}</li>)}
                        <li className="run right" onClick={this.runExp}>Run</li>
                      </ul>
                    </nav>
                    <div className="cell-scroll-outer" style={{'height': '40%'}}>
                      <div className="cell-scroll-inner grid">
                        <Graph ref="graph" graph={this.currentGraph()}>
                          <Group group={this.currentGraph()} blank={true} main={true}/>
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
                            {Output[this.state.output](this.currentGraph())}
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
