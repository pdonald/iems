var App = React.createClass({
  getInitialState: function() {
    return {
      output: 'makefile',
      currentDocument: 0,
      documents: [
        {
          name: 'Experiment #1',
          last: 1400,
          stack: [
            new GroupX(AppDefaultGraph)
          ]
        },
        {
          name: 'Experiment #2',
          last: 1,
          stack: [
            new GroupX({ id: 0, title: 'Main', x:0, y:0 })
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

     this.clipboard = new ZeroClipboard(this.refs.copyMakefileButton);
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
      this.currentDoc().last++;
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

  onConnect: function(from, to) {
    if (from && this.selectedPort) {
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
                        <li onClick={() => this.cloneDoc(this.currentDoc())}>Clone</li>
                        <li onClick={this.addDoc}>New</li>
                      </ul>
                    </nav>
                    <nav className="depth">
                      <ul>
                        {this.currentDoc().stack.map((g, index) => <li key={index} onClick={() => this.goTo(index)}>{(g.title || g.name || '#'+g.id)}</li>)}
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
                            {(this.state.output == 'makefile' ? genMakefile(this.currentGraph(), this.currentDoc().stack[0]) : JSON.stringify(this.currentGraph(), null, 2)) + '\n\n\n\n'}
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
