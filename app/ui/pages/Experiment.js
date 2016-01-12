import React from 'react'
import ReactDOM from 'react-dom'
import Reflux from 'reflux'
import jQuery from 'jquery'

import GroupModel from './Experiment/model/GroupModel'
import ProcessModel from './Experiment/model/ProcessModel'
import Output from './Experiment/model/Output'

import Graph from './Experiment/graph/Graph'
import Group from './Experiment/graph/Group'

import Properties from './Experiment/Properties'
import Variables from './Experiment/Variables'
import Toolbox from './Experiment/Toolbox'
import Actions from './Experiment/Actions'

import { clone, map } from '../utils'

export default React.createClass({
  getInitialState: function() {
    return {
      output: 'Makefile',
      document: null
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
     this.listenTo(Actions.updateStatus, this.onUpdateStatus);

     //this.clipboard = new ZeroClipboard(this.refs.copyMakefileButton);

     jQuery.get('http://localhost:8081/api/experiments/' + this.props.routeParams.id, (document) => {
       let graph = document.graph
       delete document.graph
       document.stack = [new GroupModel(graph, null, document)]
       this.setState({ document: document })
     })
  },

  save: function() {
    let stack = this.state.document.stack
    delete this.state.document.stack

    let data = clone(this.state.document)
    let graphjson = Output.JSON(stack[0])
    eval("data.graph = " + graphjson) // hahaha
    //console.log(data)

    this.state.document.stack = stack

    jQuery.ajax({
      type: 'POST',
      url: 'http://localhost:8081/api/experiments/' + this.props.routeParams.id,
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: (res) => {
        console.log(res)
      },
    })
  },

  onParamChanged: function(process, key, value) {
    if (process == this.state.document) {
      if (key in process) {
        process[key] = value;
      } else {
        process.tags[key] = value;
      }
    } else {
      process.params[key] = value;
    }
    this.setState(this.state);
  },

  onVariableChanged: function(key, value) {
    this.state.document.vars[key] = value;
    this.setState(this.state);
  },

  onUpdateStatus: function(doc, status) {
    this.state.document.status = status;
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
        var group = clone(template);
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
    if (obj == this.state.document.stack[0]) return;
    if (obj == this.state.document.stack[this.state.document.stack.length-1]) return;

    if (!obj.template) {
      obj.collapsed = false;
      this.state.document.stack.push(obj);
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

  currentGraph: function() {
    return this.state.document.stack[this.state.document.stack.length-1];
  },

  goTo: function(index) {
    while (this.state.document.stack.length-1 != index) {
      var graph = this.state.document.stack.pop();
      graph.collapsed = true;
    }
    this.currentGraph().collapsed = false;
    this.setState(this.state);
  },

  render: function() {
    if (!this.state.document) return <p>Loading</p>

    return (
      <div id="editor">
        <div id="sidebar">
          <div className="container">
            <div className="block properties"><Properties doc={this.state.document} graph={this.currentGraph()}/></div>
            <div className="block variables"><Variables vars={this.state.document.vars}/></div>
            <div className="block toolbox"><Toolbox/></div>
          </div>
        </div>

        <div id="content">
          <nav className="depth">
            <ul>
              {this.state.document.stack.map((g, index) => <li key={index} onClick={() => this.goTo(index)}>{(g.title || g.name || '#'+g.id)}</li>)}
              <li className="right" onClick={() => this.save()}>Save</li>
            </ul>
          </nav>
          <div className="grid">
            <Graph ref="graph" graph={this.currentGraph()}>
              <Group group={this.currentGraph()} blank={true} main={true}/>
            </Graph>
          </div>
          <div className="preview">
            <div className="options">
              {map(Output, key => (
                <span key={key}>
                  <label><input type="radio" readOnly name="outtype" checked={this.state.output == key ? 'checked' : ''} onClick={e => this.changeOutputType(key)}/> {key}</label>
                </span>
              ))}
            </div>
            <pre id="makefile">
              <div className="inner">
                {Output[this.state.output](this.currentGraph())}
              </div>
            </pre>
          </div>
        </div>
      </div>
    );
  }
});
