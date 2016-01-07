import React from 'react'
import ReactDOM from 'react-dom'
import Reflux from 'reflux'

import GroupModel from './model/GroupModel'
import ProcessModel from './model/ProcessModel'
import Output from './model/Output'

import Graph from './graph/Graph'
import Group from './graph/Group'

import AppDefaultGraph from './AppDefaultGraph'
import Properties from './Properties'
import Variables from './Variables'
import Server from './Server'
import Toolbox from './Toolbox'
import Actions from './Actions'

export var App = React.createClass({
  getInitialState: function() {
    var doc = {
      name: 'Experiment #1',
      vars: {
        srclang: 'en', trglang: 'lv',
        'lm-order': 5,
        'reordering-type': 'wbe', 'reordering-orientation': 'msd',
        'reordering-model': 'wbe-msd-bidirectional-fe',
        toolsdir: '/tools', workdir: '/tools/train', tempdir: '/tmp'
      },
      stack: []
    };
    doc.stack.push(new GroupModel(AppDefaultGraph, null, doc));
    return {
      output: 'Makefile',
      currentDocument: 0,
      modal: {
        open: false,
        title: '',
        content: ''
      },
      documents: [
        doc
      ]
    }
  },

  mixins: [Reflux.ListenerMixin],

  componentDidMount: function() {
     this.listenTo(Actions.move, this.onMove);
     this.listenTo(Actions.add, this.onAdd);
     this.listenTo(Actions.delete, this.onDelete);
     this.listenTo(Actions.selectManual, this.onSelectManual);
     this.listenTo(Actions.selectArea, this.onSelectArea);
     this.listenTo(Actions.deselectManual, this.onDeselectManual);
     this.listenTo(Actions.deselectAll, this.onDeselectAll);
     this.listenTo(Actions.goIntoGroup, this.onGoIntoGroup);
     this.listenTo(Actions.connect, this.onConnect);
     this.listenTo(Actions.portSelected, p => this.selectedPort = p);
     this.listenTo(Actions.portDeselected, p => this.selectedPort = null);
     this.listenTo(Actions.paramChanged, this.onParamChanged);
     this.listenTo(Actions.variableChanged, this.onVariableChanged);
     this.listenTo(Actions.viewFile, this.onViewFile);
     this.listenTo(Actions.updateStatus, this.onUpdateStatus);

     //this.clipboard = new ZeroClipboard(this.refs.copyMakefileButton);
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
    process.params[key] = value;
    this.setState(this.state);
  },

  onVariableChanged: function(key, value) {
    this.currentDoc().vars[key] = value;
    this.setState(this.state);
  },

  onUpdateStatus: function(doc, status) {
    this.currentDoc().status = status;
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
          type: template.type
        });
      }
      this.setState(this.state);
    }
  },

  onSelectManual: function(obj) {
    if (obj.selected !== true) {
      obj.selected = true;
      this.setState(this.state);
    }
  },

  onSelectArea: function(area) {
    function inArea(p) {
      var size = p.getSize();
      return ((ex >= p.x && sx <= p.x + size.width) || (p.x >= sx && p.x + size.width <= ex))
          && ((ey >= p.y && sy <= p.y + size.height) || (p.y >= sy && p.y + size.height <= ey));
    }
    var sx = Math.min(area.start.x, area.end.x);
    var ex = Math.max(area.start.x, area.end.x);
    var sy = Math.min(area.start.y, area.end.y);
    var ey = Math.max(area.start.y, area.end.y);
    var graph = this.currentGraph();
    graph.processes.forEach(p => p.selected = inArea(p));
    graph.groups.forEach(g => g.selected = inArea(g));
    this.setState(this.state);
  },

  onDeselectManual: function(obj) {
    if (obj.selected) {
      obj.selected = false;
      this.setState(this.state);
    }
  },

  onDeselectAll: function() {
    var graph = this.currentGraph();
    graph.processes.forEach(p => p.selected = false);
    graph.groups.forEach(g => g.selected = false);
    this.setState(this.state);
  },

  onGoIntoGroup: function(obj) {
    this.onDeselectAll();

    // prevents double click bugs
    if (obj == this.currentDoc().stack[0]) return;
    if (obj == this.currentDoc().stack[this.currentDoc().stack.length-1]) return;

    if (!obj.template) {
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

  currentDoc: function() {
    return this.state.documents[this.state.currentDocument];
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
                              <Properties graph={this.currentGraph()}/>
                            </div>
                          </div>
                          <div className="row">
                            <div className="cell properties">
                              <Variables vars={this.currentDoc().vars}/>
                            </div>
                          </div>
                          <div className="row">
                            <div className="cell properties server">
                              <Server doc={this.currentDoc()}/>
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
                    <div className="table">
                      <div className="row" style={{height: '100%'}}>
                        <div className="cell">
                          <nav className="depth">
                            <ul>
                              {this.currentDoc().stack.map((g, index) => <li key={index} onClick={() => this.goTo(index)}>{(g.title || g.name || '#'+g.id)}</li>)}
                            </ul>
                          </nav>
                          <div className="cell-scroll-outer" style={{'height': '100%'}}>
                            <div className="cell-scroll-inner grid"  style={{'borderTop': '1px solid #000'}}>
                              <Graph ref="graph" graph={this.currentGraph()}>
                                <Group group={this.currentGraph()} blank={true} main={true}/>
                              </Graph>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="row" style={{'borderTop': '1px solid #000'}}>
                        <div className="cell preview">
                          <button className="copy" ref="copyMakefileButton" data-clipboard-target="makefile">Copy to clipboard</button>
                          <div className="options">
                            {Object.keys(Output).map(key => (
                              <span key={key}>
                                <label><input type="radio" readOnly name="outtype" checked={this.state.output == key ? 'checked' : ''} onClick={e => this.changeOutputType(key)}/> {key}</label>
                              </span>
                            ))}
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
