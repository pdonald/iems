"use strict";

var Actions = {
  add: Reflux.createAction(),
  "delete": Reflux.createAction(),
  move: Reflux.createAction(),
  connect: Reflux.createAction(),
  select: Reflux.createAction(),
  selectArea: Reflux.createAction(),
  deselectAll: Reflux.createAction(),
  goIntoGroup: Reflux.createAction(),
  portSelected: Reflux.createAction(),
  portDeselected: Reflux.createAction(),
  paramChanged: Reflux.createAction(),
  viewFile: Reflux.createAction(),
  variableChanged: Reflux.createAction(),
  runExperiment: Reflux.createAction(),
  updateStatus: Reflux.createAction()
};
'use strict';

var App = React.createClass({
  displayName: 'App',

  getInitialState: function getInitialState() {
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
      documents: [doc]
    };
  },

  mixins: [Reflux.ListenerMixin],

  componentDidMount: function componentDidMount() {
    var _this = this;

    this.listenTo(Actions.move, this.onMove);
    this.listenTo(Actions.add, this.onAdd);
    this.listenTo(Actions['delete'], this.onDelete);
    this.listenTo(Actions.select, this.onSelect);
    this.listenTo(Actions.selectArea, this.onSelectArea);
    this.listenTo(Actions.deselectAll, this.onDeselectAll);
    this.listenTo(Actions.goIntoGroup, this.onGoIntoGroup);
    this.listenTo(Actions.connect, this.onConnect);
    this.listenTo(Actions.portSelected, function (p) {
      return _this.selectedPort = p;
    });
    this.listenTo(Actions.portDeselected, function (p) {
      return _this.selectedPort = null;
    });
    this.listenTo(Actions.paramChanged, this.onParamChanged);
    this.listenTo(Actions.variableChanged, this.onVariableChanged);
    this.listenTo(Actions.viewFile, this.onViewFile);
    this.listenTo(Actions.updateStatus, this.onUpdateStatus);

    this.clipboard = new ZeroClipboard(this.refs.copyMakefileButton);
  },

  onViewFile: function onViewFile(info) {
    var _this2 = this;

    if (info.type != 'out') return;
    if (info.group.id == info.process.id) return;

    var filename = info.process.name + '-g' + info.group.id + 'p' + info.process.id + '.' + info.label;

    this.state.modal.title = filename;
    this.state.modal.open = true;
    this.setState({ modal: this.state.modal });

    $.get('/file?name=' + filename, function (result) {
      _this2.state.modal.content = result;
      _this2.setState({ modal: _this2.state.modal });
    });
  },

  onParamChanged: function onParamChanged(process, key, value) {
    process[key] = value;
    this.setState(this.state);
  },

  onVariableChanged: function onVariableChanged(key, value) {
    this.currentDoc().vars[key] = value;
    this.setState(this.state);
  },

  onUpdateStatus: function onUpdateStatus(doc, status) {
    this.currentDoc().status = status;
    this.setState(this.state);
  },

  onMove: function onMove(pos, graph, parent) {
    graph.x = pos.x;
    graph.y = pos.y;
    this.setState(this.state);
  },

  onAdd: function onAdd(template, x, y) {
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

  onSelect: function onSelect(obj) {
    obj.selected = !obj.selected;
    this.setState(this.state);
  },

  onSelectArea: function onSelectArea(area) {
    function inArea(p) {
      var size = p.getSize();
      return (ex >= p.x && sx <= p.x + size.width || p.x >= sx && p.x + size.width <= ex) && (ey >= p.y && sy <= p.y + size.height || p.y >= sy && p.y + size.height <= ey);
    }
    var sx = Math.min(area.start.x, area.end.x);
    var ex = Math.max(area.start.x, area.end.x);
    var sy = Math.min(area.start.y, area.end.y);
    var ey = Math.max(area.start.y, area.end.y);
    var graph = this.currentGraph();
    graph.processes.forEach(function (p) {
      return p.selected = inArea(p);
    });
    graph.groups.forEach(function (g) {
      return g.selected = inArea(g);
    });
    this.setState(this.state);
  },

  onDeselectAll: function onDeselectAll() {
    var graph = this.currentGraph();
    graph.processes.forEach(function (p) {
      return p.selected = false;
    });
    graph.groups.forEach(function (g) {
      return g.selected = false;
    });
    this.setState(this.state);
  },

  onGoIntoGroup: function onGoIntoGroup(obj) {
    this.onDeselectAll();

    // prevents double click bugs
    if (obj == this.currentDoc().stack[0]) return;
    if (obj == this.currentDoc().stack[this.currentDoc().stack.length - 1]) return;

    if (!obj.template) {
      obj.collapsed = false;
      this.currentDoc().stack.push(obj);
      this.setState(this.state);
    }
  },

  onDelete: function onDelete() {
    this.currentGraph().deleteSelected();
    this.setState(this.state);
  },

  onConnect: function onConnect(from) {
    if (from && this.selectedPort) {
      if (from.id == this.selectedPort.id && from.port == this.selectedPort.port) return;
      // validate connection
      this.currentGraph().links.push({ from: from, to: this.selectedPort });
      this.setState(this.state);
    }
  },

  changeOutputType: function changeOutputType(type) {
    this.setState({ output: type });
  },

  currentDoc: function currentDoc() {
    return this.state.documents[this.state.currentDocument];
  },

  currentGraph: function currentGraph() {
    return this.currentDoc().stack[this.currentDoc().stack.length - 1];
  },

  goTo: function goTo(index) {
    while (this.currentDoc().stack.length - 1 != index) {
      var graph = this.currentDoc().stack.pop();
      graph.collapsed = true;
    }
    this.currentGraph().collapsed = false;
    this.setState(this.state);
  },

  render: function render() {
    var _this3 = this;

    return React.createElement(
      'div',
      { className: 'container' },
      React.createElement(
        'div',
        { className: 'modal ' + (this.state.modal.open ? 'open' : 'closed') },
        React.createElement(
          'div',
          { className: 'modal-header' },
          React.createElement(
            'button',
            { onClick: function () {
                return _this3.setState({ modal: { open: false } });
              } },
            'Close'
          ),
          React.createElement(
            'h1',
            null,
            this.state.modal.title
          )
        ),
        React.createElement(
          'pre',
          null,
          this.state.modal.content
        )
      ),
      React.createElement(
        'div',
        { className: 'table' },
        React.createElement(
          'div',
          { className: 'row header-row' },
          React.createElement(
            'div',
            { className: 'cell header-cell' },
            React.createElement(
              'h1',
              null,
              'Interactive Experiment Management System'
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'row' },
          React.createElement(
            'div',
            { className: 'cell' },
            React.createElement(
              'div',
              { className: 'table' },
              React.createElement(
                'div',
                { className: 'row' },
                React.createElement(
                  'div',
                  { className: 'cell', style: { 'borderRight': '1px solid #000000', 'width': '300px', 'height': '100%' } },
                  React.createElement(
                    'div',
                    { className: 'cell-scroll-outer', style: { 'height': '100%' } },
                    React.createElement(
                      'div',
                      { className: 'cell-scroll-inner' },
                      React.createElement(
                        'div',
                        { className: 'table sidebar' },
                        React.createElement(
                          'div',
                          { className: 'row' },
                          React.createElement(
                            'div',
                            { className: 'cell properties' },
                            React.createElement(Properties, null)
                          )
                        ),
                        React.createElement(
                          'div',
                          { className: 'row' },
                          React.createElement(
                            'div',
                            { className: 'cell properties' },
                            React.createElement(Variables, { vars: this.currentDoc().vars })
                          )
                        ),
                        React.createElement(
                          'div',
                          { className: 'row' },
                          React.createElement(
                            'div',
                            { className: 'cell properties server' },
                            React.createElement(Server, { doc: this.currentDoc() })
                          )
                        ),
                        React.createElement(
                          'div',
                          { className: 'row' },
                          React.createElement(
                            'div',
                            { className: 'cell toolbox' },
                            React.createElement(Toolbox, null)
                          )
                        )
                      )
                    )
                  )
                ),
                React.createElement(
                  'div',
                  { className: 'cell' },
                  React.createElement(
                    'div',
                    { className: 'table' },
                    React.createElement(
                      'div',
                      { className: 'row', style: { height: '80%' } },
                      React.createElement(
                        'div',
                        { className: 'cell' },
                        React.createElement(
                          'nav',
                          { className: 'depth' },
                          React.createElement(
                            'ul',
                            null,
                            this.currentDoc().stack.map(function (g, index) {
                              return React.createElement(
                                'li',
                                { key: index, onClick: function () {
                                    return _this3.goTo(index);
                                  } },
                                g.title || g.name || '#' + g.id
                              );
                            })
                          )
                        ),
                        React.createElement(
                          'div',
                          { className: 'cell-scroll-outer', style: { 'height': '100%' } },
                          React.createElement(
                            'div',
                            { className: 'cell-scroll-inner grid', style: { 'borderTop': '1px solid #000' } },
                            React.createElement(
                              Graph,
                              { ref: 'graph', graph: this.currentGraph() },
                              React.createElement(Group, { group: this.currentGraph(), blank: true, main: true })
                            )
                          )
                        )
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'row', style: { 'borderTop': '1px solid #000' } },
                      React.createElement(
                        'div',
                        { className: 'cell preview' },
                        React.createElement(
                          'button',
                          { className: 'copy', ref: 'copyMakefileButton', 'data-clipboard-target': 'makefile' },
                          'Copy to clipboard'
                        ),
                        React.createElement(
                          'div',
                          { className: 'options' },
                          Object.keys(Output).map(function (key) {
                            return React.createElement(
                              'span',
                              { key: key },
                              React.createElement(
                                'label',
                                null,
                                React.createElement('input', { type: 'radio', readOnly: true, name: 'outtype', checked: _this3.state.output == key ? 'checked' : '', onClick: function (e) {
                                    return _this3.changeOutputType(key);
                                  } }),
                                ' ',
                                key
                              )
                            );
                          })
                        ),
                        React.createElement(
                          'pre',
                          { id: 'makefile' },
                          Output[this.state.output](this.currentGraph())
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    );
  }
});
'use strict';

var AppDefaultGraph = {
  id: 0, title: 'Main', type: 'main', category: 'undefined',
  x: 0, y: 0, collapsed: false,
  processes: [{ id: 2, x: 24, y: 268, type: 'tokenizer', params: { lang: "$srclang", toolsdir: "$toolsdir" } }, { id: 3, x: 277, y: 274, type: 'tokenizer', params: { lang: "$trglang", toolsdir: "$toolsdir" } }, { id: 105, x: 256, y: 49, type: 'opus', params: { srclang: "$srclang", trglang: "$trglang", tempdir: "$tempdir", corpus: "EUconst" } }],
  links: [{ from: { id: 2, port: 'out' }, to: { id: 103, port: 'src' } }, { from: { id: 3, port: 'out' }, to: { id: 103, port: 'trg' } }, { from: { id: 3, port: 'out' }, to: { id: 104, port: 'trg' } }, { from: { id: 103, port: 'algn' }, to: { id: 106, port: 'algn' } }, { from: { id: 2, port: 'out' }, to: { id: 106, port: 'src' } }, { from: { id: 3, port: 'out' }, to: { id: 106, port: 'trg' } }, { from: { id: 105, port: 'src' }, to: { id: 2, port: 'in' } }, { from: { id: 105, port: 'trg' }, to: { id: 3, port: 'in' } }],
  groups: [{
    id: 103, title: 'Word alignment', type: 'word-alignment', category: 'alignment',
    x: 86, y: 444, collapsed: true,
    ports: { input: ['src', 'trg'], output: ['algn'] },
    processes: [{ id: 601, x: 20, y: 50, type: 'fastalign', params: { toolsdir: "$toolsdir", tempdir: "$tempdir" } }, { id: 602, x: 200, y: 50, type: 'fastalign', params: { reverse: "true", toolsdir: "$toolsdir", tempdir: "$tempdir" } }, { id: 603, x: 120, y: 200, type: 'symalign', params: { method: "grow-diag-final-and", toolsdir: "$toolsdir" } }],
    links: [{ from: { id: 103, port: 'src' }, to: { id: 601, port: 'src' } }, { from: { id: 103, port: 'trg' }, to: { id: 602, port: 'trg' } }, { from: { id: 103, port: 'src' }, to: { id: 602, port: 'src' } }, { from: { id: 103, port: 'trg' }, to: { id: 601, port: 'trg' } }, { from: { id: 601, port: 'out' }, to: { id: 603, port: 'srctrg' } }, { from: { id: 602, port: 'out' }, to: { id: 603, port: 'trgsrc' } }, { from: { id: 603, port: 'out' }, to: { id: 103, port: 'algn' } }]
  }, {
    id: 104, title: 'Language model', type: 'lm-kenlm', category: 'lm',
    x: 294, y: 434, collapsed: true,
    ports: { input: ['trg'], output: ['lm'] },
    processes: [{ id: 2, x: 20, y: 50, type: 'kenlm', params: { order: "$lm-order", memory: "$memory", toolsdir: "$toolsdir", tempdir: "$tempdir" } }, { id: 3, x: 20, y: 175, type: 'binarpa', params: { type: "trie", memory: "$memory", toolsdir: "$toolsdir", tempdir: "$tempdir" } }],
    links: [{ from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } }, { from: { id: 104, port: 'trg' }, to: { id: 2, port: 'in' } }, { from: { id: 3, port: 'out' }, to: { id: 104, port: 'lm' } }]
  }]
};
'use strict';

var Connector = React.createClass({
  displayName: 'Connector',

  mixins: [React.addons.PureRenderMixin],

  onClick: function onClick() {
    Actions.select(this.props.graph);
  },

  checkTypes: function checkTypes() {
    if (this.props.sourceType && this.props.targetType) {
      if (!ProcessModel.isLinkValid(this.props.sourceType, this.props.targetType)) {
        // todo
        var stype = (this.props.sourceType || {}).type || this.props.sourceType || '';
        var ttype = (this.props.targetType || {}).type || this.props.targetType || '';

        var midx = (this.props.source.x + this.props.target.x) / 2 - stype.length * 3;
        var midy = (this.props.source.y + this.props.target.y) / 2;

        var msg = React.createElement(
          'g',
          null,
          React.createElement('rect', { x: midx - 10, y: midy - 20, width: Math.max(stype.length, ttype.length) * 8, height: 50 }),
          React.createElement(
            'text',
            { x: midx, y: midy },
            stype
          ),
          React.createElement(
            'text',
            { x: midx, y: midy + 20 },
            ttype
          )
        );

        if (Math.abs(this.props.source.y - this.props.target.y) < 50) msg = React.createElement('g', null);

        return msg;
      }
    }
  },

  render: function render() {
    var msg = this.checkTypes();

    var classes = ['connector'];
    if (this.props.selected) classes.push('selected');
    if (msg) classes.push('incompatible-types');

    return React.createElement(
      'g',
      { className: classes.join(' '), onClick: this.onClick },
      React.createElement('line', { x1: this.props.source.x, y1: this.props.source.y,
        x2: this.props.target.x, y2: this.props.target.y }),
      msg
    );
  }
});
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var Draggable = React.createClass({
  displayName: 'Draggable',

  mixins: [React.addons.PureRenderMixin],

  getDefaultProps: function getDefaultProps() {
    return {
      pos: { x: 0, y: 0 },
      min: null, max: null,
      onMove: function onMove() {},
      onClick: function onClick() {}
    };
  },

  getInitialState: function getInitialState() {
    return {
      dragging: false,
      moved: false,
      pos: { x: this.props.pos.x, y: this.props.pos.y },
      rel: null // position relative to the cursor
    };
  },

  componentDidUpdate: function componentDidUpdate(props, state) {
    if (this.state.dragging && !state.dragging) {
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    } else if (!this.state.dragging && state.dragging) {
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    }
  },

  onClick: function onClick(e) {
    // handled by onMouseUp
  },

  onMouseDown: function onMouseDown(e) {
    if (e.button !== 0) return; // only left mouse button
    this.setState({
      dragging: true,
      rel: {
        x: e.pageX - this.props.pos.x,
        y: e.pageY - this.props.pos.y
      }
    });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseUp: function onMouseUp(e) {
    if (!this.state.moved) {
      this.props.onClick(e);
    }
    this.setState({ dragging: false, moved: false });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseMove: function onMouseMove(e) {
    if (!this.state.dragging) return;
    var pos = {
      x: e.pageX - this.state.rel.x,
      y: e.pageY - this.state.rel.y
    };
    if (this.props.min) {
      if (pos.x < this.props.min.x) pos.x = this.props.min.x;
      if (pos.y < this.props.min.y) pos.y = this.props.min.y;
    }
    if (this.props.max) {
      if (pos.x > this.props.max.x) pos.x = this.props.max.x;
      if (pos.y > this.props.max.y) pos.y = this.props.max.y;
    }
    this.setState({ pos: pos, moved: true });
    this.props.onMove(pos);
    e.stopPropagation();
    e.preventDefault();
  },

  render: function render() {
    return React.createElement('g', _extends({}, this.props, {
      transform: 'translate(' + this.props.pos.x + ',' + this.props.pos.y + ')',
      onClick: this.onClick,
      onMouseDown: this.onMouseDown,
      onMove: this.props.onMove }));
  }
});
'use strict';

var Graph = React.createClass({
  displayName: 'Graph',

  mixins: [React.addons.PureRenderMixin],

  render: function render() {
    var size = this.props.graph.getCalculatedSize();
    return React.createElement(
      'svg',
      { style: { width: size.width + 25 + 'px', height: size.height + 100 + 'px' } },
      React.createElement(
        Select,
        { width: size.width + 25, height: size.height + 100 },
        this.props.children
      )
    );
  }
});
'use strict';

var Group = React.createClass({
  displayName: 'Group',

  //mixins: [React.addons.PureRenderMixin],

  getPortPosition: function getPortPosition(obj, portName, dir, self) {
    var size = obj.getSize();

    var x = self ? 0 : obj.x;
    var y = self ? 0 : obj.y;
    if (self) dir = dir == 'input' ? 'output' : 'input';

    var ports = obj.getPorts();

    x += (ports[dir].indexOf(portName) + 1) * (size.width / (ports[dir].length + 1));
    y += dir == 'output' ? size.height : 0;
    y += (dir == 'output' ? 10 : -10) * (self ? -1 : 1);

    return { x: x, y: y };
  },

  render: function render() {
    var _this = this;

    var group = this.props.group;

    if (this.props.blank) {
      var groups = group.groups.map(function (g) {
        return React.createElement(Group, { key: g.getKey(), group: g });
      });

      var processes = group.processes.map(function (p) {
        var size = p.getSize();
        return React.createElement(Process, { width: size.width, height: size.height, x: p.x, y: p.y,
          graph: p, title: p.getTitle(), key: p.getKey(), selected: p.selected,
          ports: p.getPorts(), status: p.getStatus() });
      });

      var links = group.links.map(function (l) {
        var sourcep = group.getChildById(l.from.id);
        var targetp = group.getChildById(l.to.id);
        if (!sourcep || !targetp) return;
        if (sourcep.id != group.id && sourcep.getPorts().output.indexOf(l.from.port) === -1) return;
        if (targetp.id != group.id && targetp.getPorts().input.indexOf(l.to.port) === -1) return;
        var source = _this.getPortPosition(sourcep, l.from.port, 'output', l.from.id == group.id);
        var target = _this.getPortPosition(targetp, l.to.port, 'input', l.to.id == group.id);
        var from = group.resolveLinkInput(l);
        var to = group.getChildById(l.to.id);

        //console.log(from,to)
        //if (!(to instanceof GroupModel)) {
        //console.log(from.process.type, from.port, from.process.template.output[from.port], to.type, l.to.port, to.template.input[l.to.port]);

        //console.log(ProcessModel.isLinkValid(from.process.template.output[from.port], to.template.input[l.to.port]))
        //}

        if (to instanceof GroupModel) {
          //console.log(from.process.type, from.port, to.type, l.to.port);
          //console.log(to.resolveLinkOutput(l.to))
          from = null;
          to = null;
        }

        return React.createElement(Connector, { key: group.getKey() + '/' + l.from.id + '/' + l.from.port + '/' + l.to.id + '/' + l.to.port,
          selected: l.selected, graph: l,
          source: source, target: target,
          sourceType: from ? from.process.template.output[from.port] : null,
          targetType: to ? to.template.input[l.to.port] : null });
      });

      var size = group.getCalculatedSize();

      return React.createElement(
        Process,
        { width: size.width, height: size.height,
          x: group.id == 0 ? 0 : 20, y: group.id == 0 ? 0 : 50,
          graph: group, ports: group.ports,
          blank: true, main: group.id == 0 },
        groups,
        processes,
        links
      );
    } else {
      var size = group.getCollapsedSize();
      return React.createElement(Process, { width: size.width, height: size.height, x: group.x, y: group.y,
        title: group.getTitle(), graph: group, selected: group.selected,
        ports: group.ports, status: group.getStatus() });
    }
  }
});
'use strict';

var Port = React.createClass({
  displayName: 'Port',

  mixins: [React.addons.PureRenderMixin],

  getInitialState: function getInitialState() {
    return {
      pos: { x: this.props.x, y: this.props.y },
      dragging: false,
      rel: null
    };
  },

  componentDidUpdate: function componentDidUpdate(props, state) {
    if (this.state.dragging && !state.dragging) {
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    } else if (!this.state.dragging && state.dragging) {
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    }
  },

  onMouseDown: function onMouseDown(e) {
    if (e.button !== 0) return; // only left mouse button
    this.setState({
      dragging: true,
      rel: {
        x: e.pageX - +this.props.x,
        y: e.pageY - +this.props.y
      }
    });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseUp: function onMouseUp(e) {
    this.setState({ dragging: false });
    e.stopPropagation();
    e.preventDefault();
    Actions.connect({ id: this.props.process.id, port: this.props.port });
  },

  onMouseMove: function onMouseMove(e) {
    if (!this.state.dragging) return;
    var pos = {
      x: e.pageX - this.state.rel.x,
      y: e.pageY - this.state.rel.y
    };
    this.setState({ pos: pos });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseOver: function onMouseOver(e) {
    this.setState({ on: true });
    Actions.portSelected({ id: this.props.process.id, port: this.props.port });
  },

  onMouseOut: function onMouseOut(e) {
    this.setState({ on: false });
    Actions.portDeselected({ id: this.props.process.id, port: this.props.port });
  },

  onDoubleClick: function onDoubleClick(e) {
    Actions.viewFile(this.props);
  },

  render: function render() {
    var line = null;

    if (this.state.dragging) {
      line = React.createElement('line', { x1: this.props.x, y1: this.props.y,
        x2: this.state.pos.x, y2: this.state.pos.y, className: 'port-line' });
    }

    return React.createElement(
      'g',
      { className: 'port port-' + this.props.type + ' ' + (this.state.on ? 'port-on' : '') },
      React.createElement(
        'text',
        { x: +this.props.x - this.props.label.length * 2, y: +this.props.y + (this.props.type == 'input' ? -20 : 30) },
        this.props.label
      ),
      React.createElement('circle', { cx: this.props.x, cy: this.props.y, r: '10',
        onMouseDown: this.onMouseDown,
        onMouseOver: this.onMouseOver,
        onMouseOut: this.onMouseOut,
        onDoubleClick: this.onDoubleClick }),
      line
    );
  }
});
'use strict';

var Process = React.createClass({
  displayName: 'Process',

  mixins: [React.addons.PureRenderMixin],

  getDefaultProps: function getDefaultProps() {
    return { ports: { input: [], output: [] }, draggable: true, x: 0, y: 0 };
  },

  onMove: function onMove(pos) {
    Actions.move(pos, this.props.graph, this.props.parent);
  },

  goIntoGroup: function goIntoGroup(e) {
    Actions.goIntoGroup(this.props.graph);
    e.preventDefault();
    e.stopPropagation();
  },

  portName: function portName(process, type, port) {
    if (process.template) {
      var portinfo = process.getPortsInfo()[type][port];
      if (portinfo.title) {
        return portinfo.title(process, process.getParamValues());
      }
    }
    return port;
  },

  render: function render() {
    var _this = this;

    var width = this.props.width;
    var height = this.props.height;

    var ports = this.props.ports;
    var offset = {
      x: width / (ports.input.length + 1),
      y: width / (ports.output.length + 1)
    };

    var classes = ['process'];
    if (this.props.blank) classes.push('blank');
    if (this.props.main) classes.push('main');
    if (this.props.selected) classes.push('selected');
    if (this.props.status) classes.push(this.props.status);

    var padding = 10;
    var min = { x: padding, y: padding };

    return React.createElement(
      Draggable,
      { className: classes.join(' '),
        pos: { x: this.props.x, y: this.props.y }, min: min,
        onMove: this.onMove },
      React.createElement(
        'g',
        { className: this.props.graph.collapsed ? 'zoom-in' : '' },
        React.createElement('rect', { className: 'process-rect', x: '0', y: '0', width: width, height: height, onDoubleClick: this.goIntoGroup }),
        React.createElement(
          'text',
          { x: '10', y: '30', onDoubleClick: this.goIntoGroup },
          this.props.title
        ),
        React.createElement(
          'g',
          null,
          ports.input.map(function (port, index) {
            return React.createElement(Port, { process: _this.props.graph, group: _this.props.group, key: port, port: port, label: _this.portName(_this.props.graph, 'input', port), type: 'input', x: (index + 1) * offset.x, y: 0 });
          })
        ),
        React.createElement(
          'g',
          null,
          ports.output.map(function (port, index) {
            return React.createElement(Port, { process: _this.props.graph, group: _this.props.group, key: port, port: port, label: _this.portName(_this.props.graph, 'output', port), type: 'output', x: (index + 1) * offset.y, y: height });
          })
        )
      ),
      React.createElement(
        'g',
        null,
        this.props.children
      )
    );
  }
});
'use strict';

var Select = React.createClass({
  displayName: 'Select',

  mixins: [React.addons.PureRenderMixin],

  getInitialState: function getInitialState() {
    return { dragging: false };
  },

  componentDidMount: function componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  },

  componentWillMount: function componentWillMount() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  },

  componentDidUpdate: function componentDidUpdate(props, state) {
    if (this.state.dragging && !state.dragging) {
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    } else if (!this.state.dragging && state.dragging) {
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    }
  },

  onMouseDown: function onMouseDown(e) {
    if (e.button !== 0) return; // only left mouse button
    Actions.deselectAll();
    var parent = e.target.getBoundingClientRect();
    var rel = { x: parent.left, y: parent.top };
    var start = { x: e.pageX - rel.x, y: e.pageY - rel.y };
    this.setState({
      dragging: true,
      rel: rel,
      start: start,
      end: start
    });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseMove: function onMouseMove(e) {
    if (!this.state.dragging) return;
    this.setState({
      end: {
        x: e.pageX - this.state.rel.x,
        y: e.pageY - this.state.rel.y
      }
    });
    Actions.selectArea({ start: this.state.start, end: this.state.end });
    e.stopPropagation();
    e.preventDefault();
  },

  onMouseUp: function onMouseUp(e) {
    this.setState({ dragging: false });
    e.stopPropagation();
    e.preventDefault();
  },

  onKeyDown: function onKeyDown(e) {
    if (e.keyCode == 46) {
      // delete
      Actions['delete']();
    }
  },

  render: function render() {
    // covers the whole graph but is transparent
    // handles mouse events
    // must be first in <g>
    var background = React.createElement('rect', { className: 'blank', x: 0, y: 0, width: this.props.width, height: this.props.height,
      onMouseDown: this.onMouseDown });

    // if mouse is down then this semi transparent graph covers selected area
    // must be last in <g>
    var selected;
    if (this.state.dragging) {
      var x = Math.min(this.state.start.x, this.state.end.x);
      var y = Math.min(this.state.start.y, this.state.end.y);
      var width = Math.abs(Math.max(20, this.state.start.x) - Math.max(20, this.state.end.x));
      var height = Math.abs(Math.max(20, this.state.start.y) - Math.max(20, this.state.end.y));
      if (x < 20) x = 20;
      if (y < 20) y = 20;
      if (x + width + 20 > this.props.width) width = this.props.width - x - 20;
      if (y + height + 20 > this.props.height) height = this.props.height - y - 20;
      if (width < 0) width = 0;
      if (height < 0) height = 0;
      selected = React.createElement('rect', { className: 'select', x: x, y: y, width: width, height: height });
    }

    return React.createElement(
      'g',
      null,
      background,
      this.props.children,
      selected
    );
  }
});
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var GroupModel = (function () {
  function GroupModel(obj, parent, doc) {
    var _this = this;

    _classCallCheck(this, GroupModel);

    this.groups = [];
    this.processes = [];
    this.links = [];
    this.parent = parent;
    this.doc = doc;

    for (var key in obj) {
      this[key] = obj[key];
    }

    this.groups.forEach(function (g, index) {
      return _this.groups[index] = new GroupModel(g, _this, doc);
    });
    this.processes.forEach(function (p, index) {
      return _this.processes[index] = new ProcessModel(p, _this);
    });
  }

  _createClass(GroupModel, [{
    key: 'getKey',
    value: function getKey() {
      return (this.parent ? this.parent.getKey() : '') + this.type + this.id;
    }
  }, {
    key: 'getTitle',
    value: function getTitle() {
      if (this.toTitle) return this.toTitle(this);
      if (this.title) return this.title;
      return this.type;
    }
  }, {
    key: 'getPorts',
    value: function getPorts() {
      return this.ports || [];
    }
  }, {
    key: 'getMaxId',
    value: function getMaxId() {
      var gmax = Math.max.apply(null, this.groups.map(function (g) {
        return g.id;
      }));
      var pmax = Math.max.apply(null, this.processes.map(function (p) {
        return p.id;
      }));
      return Math.max.apply(null, [this.id, gmax, pmax]);
    }
  }, {
    key: 'addGroup',
    value: function addGroup(group) {
      var g = new GroupModel(group, this, this.doc);

      g.links.forEach(function (l) {
        if (!l.from.id) l.from.id = group.id;
        if (!l.to.id) l.to.id = group.id;
      });

      this.groups.push(g);
    }
  }, {
    key: 'addProcess',
    value: function addProcess(process) {
      this.processes.push(new ProcessModel(process, this));
    }
  }, {
    key: 'deleteSelected',
    value: function deleteSelected() {
      var _this2 = this;

      // remove selected items
      this.groups.filter(function (g) {
        return g.selected;
      }).slice().forEach(function (g) {
        return _this2.deleteGroup(g);
      });
      this.processes.filter(function (p) {
        return p.selected;
      }).slice().forEach(function (p) {
        return _this2.deleteProcess(p);
      });
      this.links.filter(function (l) {
        return l.selected;
      }).slice().forEach(function (l) {
        return _this2.deleteLink(l);
      });
      // if anything is selected in subgroups, delete it as well
      this.groups.forEach(function (g) {
        return g.deleteSelected();
      });
    }
  }, {
    key: 'deleteGroup',
    value: function deleteGroup(group) {
      var _this3 = this;

      this.groups.splice(this.groups.indexOf(group), 1);
      this.links.slice().forEach(function (l) {
        if (l.from.id == group.id || l.to.id == group.id) {
          _this3.deleteLink(l);
        }
      });
    }
  }, {
    key: 'deleteProcess',
    value: function deleteProcess(process) {
      var _this4 = this;

      this.processes.splice(this.processes.indexOf(process), 1);
      this.links.slice().forEach(function (l) {
        if (l.from.id == process.id || l.to.id == process.id) {
          _this4.deleteLink(l);
        }
      });
    }
  }, {
    key: 'deleteLink',
    value: function deleteLink(link) {
      this.links.splice(this.links.indexOf(link), 1);
    }
  }, {
    key: 'getSize',
    value: function getSize() {
      if (this.collapsed) {
        return this.getCollapsedSize();
      } else {
        return this.getCalculatedSize();
      }
    }
  }, {
    key: 'getCollapsedSize',
    value: function getCollapsedSize() {
      return { width: 150, height: 50 };
    }
  }, {
    key: 'getCalculatedSize',
    value: function getCalculatedSize() {
      var size = { width: 0, height: 0 };
      var padding = { x: 20, y: 50 };
      this.groups.forEach(function (g) {
        var groupSize = g.collapsed ? g.getSize() : g.getCalculatedSize();
        if (g.x + groupSize.width + padding.x > size.width) size.width = g.x + groupSize.width + padding.x;
        if (g.y + groupSize.height + padding.y > size.height) size.height = g.y + groupSize.height + padding.y;
      });
      this.processes.forEach(function (p) {
        var pSize = p.getSize();
        if (p.x + pSize.width + padding.x > size.width) size.width = p.x + pSize.width + padding.x;
        if (p.y + pSize.height + padding.y > size.height) size.height = p.y + pSize.height + padding.y;
      });
      if (size.width <= 0) size.width = 150;
      if (size.height <= 0) size.height = 50;
      return size;
    }
  }, {
    key: 'getChildById',
    value: function getChildById(id) {
      if (this.id == id) return this;
      return this.processes.filter(function (p) {
        return p.id == id;
      })[0] || this.groups.filter(function (g) {
        return g.id == id;
      })[0];
    }
  }, {
    key: 'resolveLinkInput',
    value: function resolveLinkInput(link) {
      if (link.from) {
        if (link.from.id == this.id) {
          return this.parent.resolveLinkInput({ to: link.from });
        } else {
          var child = this.processes.filter(function (p) {
            return p.id == link.from.id;
          })[0];
          if (child) {
            return { process: child, port: link.from.port };
          }
          child = this.groups.filter(function (g) {
            return g.id == link.from.id;
          })[0];
          if (child) {
            return child.resolveLinkInput({ to: link.from });
          }
        }
      } else {
        var linkTo = this.links.filter(function (l) {
          return l.to.id == link.to.id && l.to.port == link.to.port;
        })[0];
        if (linkTo) {
          return this.resolveLinkInput(linkTo);
        }
      }
      return;
    }
  }, {
    key: 'resolveLinkOutput',
    value: function resolveLinkOutput(from) {
      var _this5 = this;

      var links = this.links.filter(function (l) {
        return l.from.id == from.id && l.from.port == from.port;
      }).map(function (l) {
        return _this5.getChildById(l.to.id);
      });

      return [].concat.apply([], links);
    }
  }, {
    key: 'getStatus',
    value: function getStatus() {
      if (this.processes.filter(function (p) {
        return p.getStatus() == 'running';
      }).length > 0) return 'running';
      if (this.processes.filter(function (p) {
        return p.getStatus() == 'done';
      }).length == this.processes.length) return 'done';
    }
  }]);

  return GroupModel;
})();
'use strict';

var Output = {
  Nothing: function Nothing() {
    return '';
  },

  JSON: function JSON(graph, depth) {
    function params2str(params) {
      var arr = [];
      for (var key in params) {
        if (params[key]) {
          arr.push(key + ': "' + (params[key] + '').replace('"', '\\"') + '"');
        }
      }
      return arr.join(', ');
    }

    if (!depth) depth = 0;
    var pad = '';for (var i = 0; i < depth + 1 * depth + 1; i++) pad += '  ';
    var pad1 = '';for (var i = 0; i < depth + 1 * depth; i++) pad1 += '  ';
    var pad2 = '';for (var i = 0; i < depth + 1 * depth + 2; i++) pad2 += '  ';

    // group data
    var json = pad1 + '{' + '\n';
    json += pad + ('id: ' + graph.id + ', title: \'' + graph.title.replace("'", "\\'") + '\', ') + ('type: \'' + graph.type + '\', category: \'' + graph.category + '\',') + '\n';
    json += pad + ('x: ' + graph.x + ', y: ' + graph.y + ', collapsed: ' + (graph.collapsed ? true : false) + ',') + '\n';
    if (graph.ports) json += pad + ('ports: { input: [\'' + graph.ports.input.join("', '") + '\'], output: [\'' + graph.ports.output.join("', '") + '\'] },') + '\n';

    // processes data
    json += pad + 'processes: [' + '\n';
    json += graph.processes.map(function (p) {
      return '{ id: ' + p.id + ', x: ' + p.x + ', y: ' + p.y + ', type: \'' + p.type + '\', params: { ' + params2str(p.params) + ' } }';
    }).map(function (s) {
      return pad2 + s;
    }).join(',\n') + '\n';
    json += pad + ']';

    // links data
    if (graph.links.length) {
      json += ',' + '\n';
      json += pad + 'links: [' + '\n';
      json += graph.links.map(function (l) {
        return '{ from: { id: ' + l.from.id + ', port: \'' + l.from.port + '\' }, to: { id: ' + l.to.id + ', port: \'' + l.to.port + '\' } }';
      }).map(function (s) {
        return pad2 + s;
      }).join(',\n') + '\n';
      json += pad + ']';
    }

    if (graph.groups.length) {
      json += ',' + '\n';
      json += pad + 'groups: [' + '\n';
      json += graph.groups.map(function (g) {
        return Output.JSON(g, depth + 1);
      }).join(',\n') + '\n';
      json += pad + ']';
    }

    json += '\n';
    json += pad1 + '}';

    if (depth == 0) json += '\n';

    return json;
  },

  Makefile: function Makefile(graph, all, cache) {
    var text = '';

    var root = !all;
    if (root) all = [];

    graph.processes.forEach(function (p) {
      var input = {};
      var output = {};
      var noOutput = null;

      var ports = p.getPorts();

      ports.output.forEach(function (key) {
        output[key] = p.getMakefileKey(key);
        all.push(output[key]);
      });

      if (ports.output.length == 0) {
        noOutput = p.getMakefileKey('done');
        all.push(noOutput);
      }

      graph.links.filter(function (l) {
        return l.to.id == p.id;
      }).forEach(function (l) {
        var result = graph.resolveLinkInput(l);
        if (result) {
          input[l.to.port] = result.process.getMakefileKey(result.port);
        } else {
          //console.error(`Missing link for ${p.type}`);
        }
      });

      text += noOutput || Object.keys(output).map(function (key) {
        return output[key];
      }).join(' ');
      text += ': ';
      text += Object.keys(input).map(function (key) {
        return input[key];
      }).join(' ');
      text += '\n';
      text += '\t' + ('touch status.' + p.getMakefileKey('running')) + '\n';
      text += '\t' + p.template.toBash(p.getParamValues(), input, output).join('\n\t') + '\n';
      if (noOutput) text += '\ttouch ' + noOutput + '\n';
      text += '\t' + ('mv status.' + p.getMakefileKey('running') + ' status.' + p.getMakefileKey('done')) + '\n';
      text += '\n';
    });

    graph.groups.forEach(function (g) {
      return text += Output.Makefile(g, all, cache) + '\n';
    });

    if (root) {
      text = '.PHONY: all clean\n\n' + 'all: ' + all.join(' ') + '\n\n' + 'clean:\n\trm -rf status.* ' + all.join(' ') + '\n\n' + text;
    }

    return text;
  }
};
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var ProcessModel = (function () {
  function ProcessModel(obj, group) {
    _classCallCheck(this, ProcessModel);

    for (var key in obj) {
      this[key] = obj[key];
    }

    if (!(this.type in Tools.processes)) throw Error('No such tool: ' + this.type);

    this.group = group;
    this.params = this.params || {};
    this.template = Tools.processes[this.type];

    for (var key in this.template.params) {
      if (!this.params[key] && this.template.params[key]['default']) {
        this.params[key] = this.template.params[key]['default'];
      }
    }
  }

  _createClass(ProcessModel, [{
    key: 'getParamValues',
    value: function getParamValues() {
      function resolveParams(params, vars) {
        var result = {};
        for (var key in params) {
          if (params[key][0] == '$') {
            if (params[key].substr(1) in vars) {
              result[key] = vars[params[key].substr(1)];
            } else {
              result[key] = undefined;
            }
          } else {
            result[key] = params[key];
          }
        }
        return result;
      }

      return resolveParams(this.params, this.group.doc.vars);
    }
  }, {
    key: 'getTitle',
    value: function getTitle() {
      if (this.title) return this.title;
      if (this.template.toTitle) return this.template.toTitle(this, this.getParamValues());
      if (this.template.title) return this.template.title;
      return this.type;
    }
  }, {
    key: 'getSize',
    value: function getSize() {
      return {
        width: this.width || this.template.width || Math.max(150, Object.keys(this.template.input).length * 50),
        height: this.height || this.template.height || 50
      };
    }
  }, {
    key: 'getPorts',
    value: function getPorts() {
      return {
        input: Object.keys(this.template.input.call ? this.template.input(this, this.getParamValues()) : this.template.input),
        output: Object.keys(this.template.output.call ? this.template.output(this, this.getParamValues()) : this.template.output)
      };
    }
  }, {
    key: 'getPortsInfo',
    value: function getPortsInfo() {
      return {
        input: this.template.input.call ? this.template.input(this, this.getParamValues()) : this.template.input,
        output: this.template.output.call ? this.template.output(this, this.getParamValues()) : this.template.output
      };
    }
  }, {
    key: 'getInput',
    value: function getInput() {
      var _this = this;

      var link = this.group.links.filter(function (l) {
        return l.to.id == _this.id;
      })[0];
      if (link) {
        return this.group.resolveLinkInput(link);
      }
    }
  }, {
    key: 'getKey',
    value: function getKey() {
      return this.type + '-g' + this.group.id + 'p' + this.id;
    }
  }, {
    key: 'getHashKey',
    value: function getHashKey() {
      var key = [];
      key.push('template=' + this.type);
      key.push('templateVer=' + this.template.version);
      var params = this.getParamValues();
      for (var name in this.template.params) {
        if (this.template.params[name].nohash) continue;
        if (name in params) {
          key.push('param:' + name + '=' + params[name]);
        }
      }
      var prev = this.getInput();
      return (prev ? prev.process.getHashKey() + '/' + prev.port : '<root>') + ' -> ' + key.join(';');
    }
  }, {
    key: 'getMakefileKey',
    value: function getMakefileKey(port) {
      var hash = ProcessModel.hashFnv32a(this.getHashKey(), true);
      return this.type + '-' + hash + (port ? '.' + port : '');
    }
  }, {
    key: 'getStatus',
    value: function getStatus() {
      if (this.group.doc.status) {
        return this.group.doc.status[this.getMakefileKey()];
      }
    }
  }], [{
    key: 'isLinkValid',
    value: function isLinkValid(a, b) {
      var atype = a.type || a;
      var btype = b.type || b;
      if (atype == 'file<any>' || btype == 'file<any>') return true;
      return atype == btype;
    }
  }, {
    key: 'hashFnv32a',
    value: function hashFnv32a(str, asString, seed) {
      var i,
          l,
          hval = seed === undefined ? 0x811c9dc5 : seed;
      for (i = 0, l = str.length; i < l; i++) {
        hval ^= str.charCodeAt(i);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
      }
      if (asString) {
        return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
      }
      return hval >>> 0;
    }
  }]);

  return ProcessModel;
})();
'use strict';

var Tools = {
  processes: {
    cp: {
      type: 'cp', title: 'Copy local file', category: 'corpora',
      params: { source: 'string' },
      input: {},
      output: { out: 'file<any>' },
      toBash: function toBash(params, input, output) {
        return ['cp ' + params.source + ' ' + output.out];
      }
    },
    echo: {
      type: 'echo', category: 'corpora',
      input: {},
      output: { out: 'file<text>' },
      params: { text: 'string' },
      toBash: function toBash(params, input, output) {
        return ['echo "' + (params.text + '').replace('"', '\\"') + '" > ' + output.out];
      }
    },
    wget: {
      type: 'wget', category: 'corpora',
      params: { url: 'string' },
      input: {},
      output: { out: 'file<any>' },
      toBash: function toBash(params, input, output) {
        return ['wget ' + params.url + ' -O ' + output.out];
      }
    },
    opus: {
      type: 'opus', title: 'OPUS', category: 'corpora',
      params: {
        corpus: 'string',
        srclang: { type: 'language', 'default': '$srclang' },
        trglang: { type: 'language', 'default': '$trglang' },
        tempdir: { type: 'path', 'default': '$tempdir' }
      },
      input: {},
      output: {
        src: {
          type: 'file<text>',
          title: function title(p, params) {
            return params.srclang ? params.srclang : 'src';
          }
        },
        trg: {
          type: 'file<text>',
          title: function title(p, params) {
            return params.trglang ? params.trglang : 'trg';
          }
        }
      },
      toTitle: function toTitle(p, params) {
        if (params.corpus) return 'OPUS (' + params.corpus + ')';
        return 'OPUS';
      },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp --tmpdir=' + params.tempdir + ') && \\', 'wget http://opus.lingfil.uu.se/' + params.corpus + '/' + params.srclang + '-' + params.trglang + '.txt.zip -O $$TEMP && \\', 'unzip -p $$TEMP ' + params.corpus + '.' + params.srclang + '-' + params.trglang + '.' + params.srclang + ' > ' + output.src + ' && \\', 'unzip -p $$TEMP ' + params.corpus + '.' + params.srclang + '-' + params.trglang + '.' + params.trglang + ' > ' + output.trg + ' && \\', 'rm $$TEMP'];
      }
    },
    tokenizer: {
      type: 'tokenizer', title: 'Tokenizer (moses)', category: 'corpora',
      width: 200,
      params: {
        lang: { type: 'language', 'default': '$srclang' },
        toolsdir: { type: 'path', 'default': '$toolsdir' }
      },
      input: { 'in': 'file<text>' },
      output: { out: 'file<tok>' },
      toTitle: function toTitle(p, params) {
        return params.lang ? 'Tokenizer [' + params.lang + '] (moses)' : p.title;
      },
      toBash: function toBash(params, input, output) {
        return ['perl ' + params.toolsdir + '/moses/scripts/tokenizer/tokenizer.perl -l ' + params.lang + ' < ' + input['in'] + ' > ' + output.out];
      }
    },
    detokenizer: {
      type: 'detokenizer', title: 'Detokenizer (moses)', category: 'corpora',
      input: { 'in': 'file<tok>' },
      output: { out: 'file<text>' },
      params: {
        lang: { type: 'language', 'default': '$trglang' },
        toolsdir: { type: 'path', 'default': '$toolsdir' }
      },
      toBash: function toBash(params, input, output) {
        return ['perl ' + params.toolsdir + '/moses/scripts/tokenizer/detokenizer.perl -l ' + params.lang + ' < ' + input['in'] + ' > ' + output.out];
      }
    },
    kenlm: {
      type: 'kenlm', title: 'KenLM', category: 'lm',
      params: {
        order: { type: 'uint', 'default': '$lm-order' },
        memory: { type: 'size-unit', 'default': '$memory', nohash: true },
        toolsdir: { type: 'path', 'default': '$toolsdir' },
        tempdir: { type: 'path', 'default': '$tempdir', nohash: true }
      },
      input: { 'in': 'file<tok>' },
      output: { out: 'file<arpa>' },
      toTitle: function toTitle(p, params) {
        return 'KenLM' + (params.order ? ', order = ' + params.order : '');
      },
      toBash: function toBash(params, input, output) {
        var args = [];
        if (params.tempdir) args.push('-T ' + params.tempdir);
        if (params.memory) args.push('-S ' + params.memory);
        return [params.toolsdir + '/kenlm/lmplz -o ' + params.order + ' ' + args.join(' ') + ' < ' + input['in'] + ' > ' + output.out];
      }
    },
    binarpa: {
      type: 'binarpa', title: 'Binarize LM', category: 'lm',
      params: {
        type: { type: 'string', 'default': 'trie' },
        memory: { type: 'size-unit', 'default': '$memory', nohash: true },
        toolsdir: { type: 'path', 'default': '$toolsdir' },
        tempdir: { type: 'path', 'default': '$tempdir', nohash: true }
      },
      input: { 'in': 'file<arpa>' },
      output: { out: 'file<lm-bin>' },
      toBash: function toBash(params, input, output) {
        var args = [];
        if (params.tempdir) args.push('-T ' + params.tempdir);
        if (params.memory) args.push('-S ' + params.memory);
        return [params.toolsdir + '/kenlm/build_binary ' + params.type + ' ' + args.join(' ') + ' ' + input['in'] + ' ' + output.out];
      }
    },
    fastalign: {
      type: 'fastalign', title: 'Fast align', category: 'alignment', version: 1,
      params: {
        reverse: { type: 'bool', 'default': false },
        toolsdir: { type: 'path', 'default': '$toolsdir' },
        tempdir: { type: 'path', 'default': '$tempdir' }
      },
      input: { src: 'file<tok>', trg: 'file<tok>' },
      output: { out: 'file<align>' },
      toTitle: function toTitle(p, params) {
        return 'fast align' + (params.reverse === true || params.reverse == 'true' ? ' (reverse)' : '');
      },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp --tmpdir=' + params.tempdir + ') && \\', 'paste -d" ||| " ' + input.src + ' /dev/null /dev/null /dev/null /dev/null ' + input.trg + ' > $$TEMP && \\', params.toolsdir + '/fast_align/fast_align ' + (params.reverse ? '-r' : '') + ' -i $$TEMP > ' + output.out + ' && \\', 'rm $$TEMP'];
      }
    },
    symalign: {
      type: 'symalign', title: 'Sym alignments', category: 'alignment',
      params: {
        method: { type: 'string', 'default': 'grow-diag-final-and' },
        toolsdir: { type: 'path', 'default': '$toolsdir' }
      },
      input: { srctrg: 'file<align>', trgsrc: 'file<align>' },
      output: { out: 'file<align>' },
      toBash: function toBash(params, input, output) {
        return [params.toolsdir + '/fast_align/atools -c ' + params.method + ' -i ' + input.srctrg + ' -j ' + input.trgsrc + ' > ' + output.out];
      }
    },
    extractphrases: {
      title: 'Extract phrases', type: 'extractphrases', category: 'phrases',
      params: {
        maxLength: { type: 'uint', 'default': 7 },
        type: { type: 'string', 'default': '$reordering-type' },
        orientation: { type: 'string', 'default': '$reordering-orientation' },
        toolsdir: { type: 'path', 'default': '$toolsdir' },
        tempdir: { type: 'path', 'default': '$tempdir' }
      },
      input: { src: 'file<tok>', trg: 'file<tok>', algn: 'file<align>' },
      output: function output(p, params) {
        var output = { out: 'file<phrases>', inv: 'file<phrases>' };
        if (params.model) output.o = 'file<any>';
        return output;
      },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d --tmpdir=' + params.tempdir + ') && \\', params.toolsdir + '/moses/extract ' + input.trg + ' ' + input.src + ' ' + input.algn + ' $$TEMP/extract ' + params.maxLength + ' orientation --model ' + params.type + '-' + params.orientation + ' && \\', 'LC_ALL=C sort $$TEMP/extract -T $$TEMP > ' + output.out + ' && \\', 'LC_ALL=C sort $$TEMP/extract.inv -T $$TEMP > ' + output.inv + ' && \\', 'LC_ALL=C sort $$TEMP/extract.o -T $$TEMP > ' + output.o + ' && \\', 'rm -r $$TEMP'];
      }
    },
    // todo: split into score+score+consolidate
    scorephrases: {
      title: 'Score phrases', type: 'scorephrases', category: 'phrases',
      params: {
        toolsdir: { type: 'path', 'default': '$toolsdir' },
        tempdir: { type: 'path', 'default': '$tempdir' }
      },
      input: { phr: 'file<phrases>', phrinv: 'file<phrases>', srctrg: 'file<lex>', trgsrc: 'file<lex>' },
      output: { ptable: 'file<phrase-table>' },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d --tmpdir=' + params.tempdir + ') && \\', params.toolsdir + '/moses/score ' + input.phr + ' ' + input.trgsrc + ' /dev/stdout > $$TEMP/trgsrc && \\', params.toolsdir + '/moses/score ' + input.phrinv + ' ' + input.srctrg + ' /dev/stdout --Inverse > $$TEMP/srctrg && \\', 'LC_ALL=C sort $$TEMP/srctrg -T $$TEMP | gzip > $$TEMP/srctrg.sorted.gz && \\', 'LC_ALL=C sort $$TEMP/trgsrc -T $$TEMP | gzip > $$TEMP/trgsrc.sorted.gz && \\', params.toolsdir + '/moses/consolidate $$TEMP/trgsrc.sorted.gz $$TEMP/srctrg.sorted.gz ' + output.ptable + ' && \\', 'rm -r $$TEMP'];
      }
    },
    phrasesbin: {
      title: 'Binarize phrases', type: 'phrasesbin', category: 'phrases',
      input: { ptable: 'file<phrase-table>' },
      output: { minphr: 'file<phrase-table-bin>' },
      params: {
        toolsdir: { type: 'path', 'default': '$toolsdir' },
        threads: { type: 'uint', 'default': '$threads' }
      },
      toBash: function toBash(params, input, output) {
        return [params.toolsdir + '/moses/processPhraseTableMin -nscores 4 -threads ' + (params.threads || 1) + ' -in ' + input.ptable + ' -out ' + output.minphr];
      }
    },

    //`mv ${output.bin}.minphr ${output.bin}`
    lexical: {
      title: 'Lexical', type: 'lexical', category: 'phrases',
      params: {
        toolsdir: { type: 'path', 'default': '$toolsdir' },
        tempdir: { type: 'path', 'default': '$tempdir' }
      },
      input: { src: 'file<tok>', trg: 'file<tok>', algn: 'file<align>' },
      output: { srctrg: 'file<lex>', trgsrc: 'file<lex>' },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d --tmpdir=' + params.tempdir + ') && \\', 'perl ' + params.toolsdir + '/moses/scripts/training/get-lexical.perl ' + input.src + ' ' + input.trg + ' ' + input.algn + ' $$TEMP/lex && \\', 'mv $$TEMP/lex.e2f ' + output.srctrg + ' && \\', 'mv $$TEMP/lex.f2e ' + output.trgsrc + ' && \\', 'rm -r $$TEMP'];
      }
    },
    reordering: {
      title: 'Reordering', type: 'reordering', category: 'phrases',
      params: {
        type: { type: 'string', 'default': '$reordering-type' },
        orientation: { type: 'string', 'default': '$reordering-orientation' },
        model: { type: 'string', 'default': '$reordering-model' },
        smoothing: { type: 'float', 'default': 0.5 },
        toolsdir: { type: 'path', 'default': '$toolsdir' },
        tempdir: { type: 'path', 'default': '$tempdir' }
      },
      input: { phr: 'file<any>' },
      output: { reord: 'file<reordering>' },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d --tmpdir=' + params.tempdir + ') && \\', params.toolsdir + '/moses/lexical-reordering-score ' + input.phr + ' ' + params.smoothing + ' $$TEMP/output. --model "' + params.type + ' ' + params.orientation + ' ' + params.model + '" && \\', 'zcat $$TEMP/output.' + params.model + '.gz > ' + output.reord + ' && \\', 'rm -r $$TEMP'];
      }
    },
    binreordering: {
      title: 'Binarize reordering', type: 'binreordering', category: 'phrases',
      input: { reord: 'file<reordering>' },
      output: { minlexr: 'file<reordering-bin>' },
      params: {
        toolsdir: { type: 'path', 'default': '$toolsdir' },
        threads: { type: 'uint', 'default': '$threads' }
      },
      toBash: function toBash(params, input, output) {
        return [params.toolsdir + '/moses/processLexicalTableMin -threads ' + (params.threads || 1) + ' -in ' + input.reord + ' -out ' + output.minlexr];
      }
    },

    //`mv ${output.reord}.minlexr ${output.reord}`
    'moses-ini': {
      type: 'moses-ini', title: 'Moses INI', category: 'decoder',
      width: 300,
      input: { phr: ['file<phrase-table>', 'file<phrase-table-bin'], lm: 'file<binlm>', reord: 'file<reord>', sample: 'sampling' },
      output: { ini: 'file<moses>' },
      toBash: function toBash(params, input, output) {
        var ini = [];
        ini.push('[input-factors]');
        ini.push('0');
        ini.push('[mapping]');
        ini.push('0 T 0');
        ini.push('[distortion-limit]');
        ini.push('6');
        ini.push('[feature]');
        ini.push('UnknownWordPenalty');
        ini.push('WordPenalty');
        ini.push('PhrasePenalty');
        ini.push('Distortion');
        if (input.phr) ini.push('PhraseDictionaryCompact name=TranslationModel0 num-features=4 path=/tools/train/' + input.phr + ' input-factor=0 output-factor=0');
        if (input.reord) ini.push('LexicalReordering name=LexicalReordering0 num-features=6 type=wbe-msd-bidirectional-fe-allff input-factor=0 output-factor=0 path=/tools/train/' + input.reord.replace('.minlexr', ''));
        if (input.lm) ini.push('KENLM lazyken=0 name=LM0 factor=0 path=/tools/train/' + input.lm + ' order=3');
        ini.push('[weight]');
        ini.push('UnknownWordPenalty0= 1');
        ini.push('WordPenalty0= -1');
        ini.push('PhrasePenalty0= 0.2');
        if (input.phr) ini.push('TranslationModel0= 0.2 0.2 0.2 0.2');
        ini.push('Distortion0= 0.3');
        if (input.reord) ini.push('LexicalReordering0= 0.3 0.3 0.3 0.3 0.3 0.3');
        if (input.lm) ini.push('LM0= 0.5');

        var cmd = [];
        cmd.push('echo > ' + output.ini);
        ini.forEach(function (l) {
          return cmd.push('echo "' + l + '" >> ' + output.ini);
        });
        if (input.sample) cmd.push('cat ' + input.sample + '/moses.ini >> ' + output.ini);
        return cmd;
      }
    },
    moses: {
      type: 'moses', title: 'moses decoder', category: 'decoder',
      input: { 'in': 'file<tok>', ini: 'file<moses>' },
      output: { out: 'file<tok>' },
      toBash: function toBash(params, input, output) {
        return ['sudo docker run -a stdin -a stdout -a stderr -v /tools/train:/tools/train -i germann/moses-production.static /moses/bin/moses -f /tools/train/' + input.ini + ' < ' + input['in'] + ' > ' + output.out];
      }
    },
    bleu: {
      type: 'bleu', title: 'BLEU', category: 'evaluation',
      input: { trans: 'file<text>', src: 'file<text>', ref: 'file<text>' },
      output: { out: 'file<bleu>' },
      params: { 'case': 'bool' },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d) && \\', 'perl /tools/wrap-sgm.perl ref xx yy < ' + input.ref + ' > $$TEMP/ref.sgm && \\', 'perl /tools/wrap-sgm.perl src xx < ' + input.src + ' > $$TEMP/src.sgm && \\', 'perl /tools/scripts/ems/support/wrap-xml.perl yy $$TEMP/src.sgm < ' + input.trans + ' > $$TEMP/trans.sgm && \\', 'perl /tools/scripts/generic/mteval-v13a.pl -s $$TEMP/src.sgm -r $$TEMP/ref.sgm -t $$TEMP/trans.sgm -b -d 3 ' + (params['case'] ? '-c' : '') + ' > ' + output.out + ' && \\', 'cat ' + output.out + ' && \\', 'rm -r $$TEMP'];
      }
    },
    compareval: {
      type: 'compareval', title: ' MT-ComparEval', category: 'evaluation',
      input: { src: 'file<tok>', ref: 'file<tok>', trans: 'file<tok>' },
      output: {},
      params: { server: 'string', experiment: 'string', task: 'string' },
      toBash: function toBash(params, input, output) {
        return ['EXPID=$(shell curl -s -X POST -F "name=' + params.experiment + '" -F "description=' + params.experiment + '" -F "source=@' + input.src + '" -F "reference=@' + input.ref + '" ' + params.server + '/api/experiments/upload | jq ".experiment_id") && \\', 'curl -s -X POST -F "name=' + params.task + '" -F "description=' + params.task + '" -F "experiment_id=$$EXPID" -F "translation=@' + input.trans + '" ' + params.server + '/api/tasks/upload'];
      }
    },
    bintext: {
      type: 'bintext', title: 'Binarize text', category: 'phrases',
      input: { 'in': 'file<tok>' },
      output: { out: 'dir<bin>' },
      params: { toolsdir: { type: 'path', 'default': '$toolsdir' } },
      toBash: function toBash(params, input, output) {
        return ['rm -rf ' + output.out, 'mkdir ' + output.out, params.toolsdir + '/moses/mtt-build -i -o ' + output.out + '/corpus < ' + input['in']];
      }
    },
    binalign: {
      type: 'binalign', title: 'Binarize alignments', category: 'phrases',
      input: { 'in': 'file<align>' },
      output: { out: 'file<bin>' },
      params: { toolsdir: { type: 'path', 'default': '$toolsdir' } },
      toBash: function toBash(params, input, output) {
        return [params.toolsdir + '/moses/symal2mam ' + output.out + ' < ' + input['in']];
      }
    },
    binlex: {
      type: 'binlex', title: 'Binarize lex', category: 'phrases',
      input: { src: 'dir<bin>', trg: 'dir<bin>', algn: 'file<bin>' },
      output: { out: 'file<bin>' },
      params: { toolsdir: { type: 'path', 'default': '$toolsdir' } },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d) && \\', 'ln -s `readlink -f ' + input.src + '/corpus.mct` $$TEMP/corpus.src.mct && \\', 'ln -s `readlink -f ' + input.src + '/corpus.sfa` $$TEMP/corpus.src.sfa && \\', 'ln -s `readlink -f ' + input.src + '/corpus.tdx` $$TEMP/corpus.src.tdx && \\', 'ln -s `readlink -f ' + input.trg + '/corpus.mct` $$TEMP/corpus.trg.mct && \\', 'ln -s `readlink -f ' + input.trg + '/corpus.sfa` $$TEMP/corpus.trg.sfa && \\', 'ln -s `readlink -f ' + input.trg + '/corpus.tdx` $$TEMP/corpus.trg.tdx && \\', 'ln -s `readlink -f ' + input.algn + '` $$TEMP/corpus.src-trg.mam && \\', params.toolsdir + '/moses/mmlex-build $$TEMP/corpus. src trg -o ' + output.out + ' && \\', 'rm -rf $$TEMP'];
      }
    },
    'phrases-sampling-model': {
      type: 'phrases-sampling-model', title: 'Sampling model', category: 'phrases',
      input: { src: 'dir<bin>', trg: 'dir<bin>', algn: 'file<bin>', lex: 'file<bin>' },
      output: { out: 'dir' },
      params: {},
      toBash: function toBash(params, input, output) {
        var ini = [];
        ini.push('[feature]');
        ini.push('LexicalReordering name=DM0 type=hier-mslr-bidirectional-fe-allff input-factor=0 output-factor=0');
        ini.push('Mmsapt name=PT0 lr-func=DM0 path=/tools/train/' + output.out + '/ L1=src L2=trg sample=1000');
        ini.push('[weight]');
        ini.push('DM0= 0.3 0.3 0.3 0.3 0.3 0.3 0.3 0.3');

        var cmd = [];
        cmd.push('rm -rf ' + output.out);
        cmd.push('mkdir ' + output.out);
        cmd.push('echo > ' + output.out + '/moses.ini');
        cmd.push('ln -s `readlink -f ' + input.src + '/corpus.mct` ' + output.out + '/src.mct');
        cmd.push('ln -s `readlink -f ' + input.src + '/corpus.sfa` ' + output.out + '/src.sfa');
        cmd.push('ln -s `readlink -f ' + input.src + '/corpus.tdx` ' + output.out + '/src.tdx');
        cmd.push('ln -s `readlink -f ' + input.trg + '/corpus.mct` ' + output.out + '/trg.mct');
        cmd.push('ln -s `readlink -f ' + input.trg + '/corpus.sfa` ' + output.out + '/trg.sfa');
        cmd.push('ln -s `readlink -f ' + input.trg + '/corpus.tdx` ' + output.out + '/trg.tdx');
        cmd.push('ln -s `readlink -f ' + input.algn + '` ' + output.out + '/src-trg.mam');
        cmd.push('ln -s `readlink -f ' + input.lex + '` ' + output.out + '/src-trg.lex');
        ini.forEach(function (line) {
          return cmd.push('echo "' + line + '" >> ' + output.out + '/moses.ini');
        });
        return cmd;
      }
    },
    mert: {
      type: 'mert', title: 'MERT', category: 'tuning',
      input: { src: 'file<tok>', ref: 'file<tok>', ini: 'file<ini>' },
      output: { ini: 'file<ini>' },
      params: {},
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d) && \\', 'perl /tools/scripts/training/mert-moses.pl ' + input.src + ' ' + input.ref + ' /tools/moses ' + input.ini + ' --no-filter-phrase-table --mertdir /tools/ --working-dir $$TEMP && \\', 'cp $$TEMP/moses.ini ' + output.ini + ' && \\', 'rm -rf $$TEMP'];
      }
    }
  },
  groups: {
    'lm-kenlm': {
      type: 'lm-kenlm', title: 'Language model', category: 'lm',
      ports: { input: ['trg'], output: ['lm'] },
      processes: [{ id: 2, type: 'kenlm', params: {}, x: 20, y: 50 }, { id: 3, type: 'binarpa', params: {}, x: 20, y: 175 }],
      links: [{ from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } }, { from: { id: undefined, port: 'trg' }, to: { id: 2, port: 'in' } }, { from: { id: 3, port: 'out' }, to: { id: undefined, port: 'lm' } }]
    },
    'phraseextraction': {
      title: 'Phrase Extraction', type: 'phraseextraction', category: 'phrases',
      ports: { input: ['src', 'trg', 'algn'], output: ['model'] },
      processes: [{ id: 1, x: 69, y: 80, type: 'extractphrases', params: { maxLength: "7", model: "xxx", toolsdir: "$toolsdir", tempdir: "$tempdir" } }, { id: 2, x: 66, y: 258, type: 'scorephrases', params: { toolsdir: "$toolsdir", tempdir: "$tempdir" } }, { id: 3, x: 376, y: 109, type: 'lexical', params: { toolsdir: "$toolsdir", tempdir: "$tempdir" } }, { id: 4, x: 75, y: 435, type: 'phrasesbin', params: { toolsdir: "$toolsdir", threads: "$threads" } }, { id: 5, x: 408, y: 274, type: 'reordering', params: { toolsdir: "$toolsdir", tempdir: "$tempdir" } }, { id: 6, x: 413, y: 462, type: 'binreordering', params: { toolsdir: "$toolsdir", threads: "$threads" } }],
      links: [{ from: { id: 111, port: 'reord' }, to: { id: 6, port: 'reord' } }, { from: { id: undefined, port: 'src' }, to: { id: 1, port: 'src' } }, { from: { id: undefined, port: 'trg' }, to: { id: 1, port: 'trg' } }, { from: { id: undefined, port: 'algn' }, to: { id: 1, port: 'algn' } }, { from: { id: undefined, port: 'src' }, to: { id: 3, port: 'src' } }, { from: { id: undefined, port: 'trg' }, to: { id: 3, port: 'trg' } }, { from: { id: 2, port: 'ptable' }, to: { id: 4, port: 'ptable' } }, { from: { id: undefined, port: 'algn' }, to: { id: 3, port: 'algn' } }, { from: { id: 3, port: 'srctrg' }, to: { id: 2, port: 'srctrg' } }, { from: { id: 3, port: 'trgsrc' }, to: { id: 2, port: 'trgsrc' } }, { from: { id: 1, port: 'o' }, to: { id: 5, port: 'phr' } }, { from: { id: 1, port: 'out' }, to: { id: 2, port: 'phr' } }, { from: { id: 1, port: 'inv' }, to: { id: 2, port: 'phrinv' } }, { from: { id: 5, port: 'reord' }, to: { id: 6, port: 'reord' } }]
    },
    'phrasesampling': {
      title: 'Sampling Phrases', type: 'phrasesampling', category: 'phrases',
      ports: { input: ['src', 'trg', 'algn'], output: ['model'] },
      processes: [{ id: 2, x: 20, y: 50, type: 'bintext' }, { id: 3, x: 214, y: 50, type: 'bintext' }, { id: 4, x: 397, y: 50, type: 'binalign' }, { id: 5, x: 387, y: 224, type: 'binlex' }, { id: 6, x: 135, y: 375, type: 'phrases-sampling-model' }],
      links: [{ from: { id: undefined, port: 'src' }, to: { id: 2, port: 'in' } }, { from: { id: undefined, port: 'trg' }, to: { id: 3, port: 'in' } }, { from: { id: undefined, port: 'algn' }, to: { id: 4, port: 'in' } }, { from: { id: 2, port: 'out' }, to: { id: 5, port: 'src' } }, { from: { id: 3, port: 'out' }, to: { id: 5, port: 'trg' } }, { from: { id: 4, port: 'out' }, to: { id: 6, port: 'algn' } }, { from: { id: 2, port: 'out' }, to: { id: 6, port: 'src' } }, { from: { id: 3, port: 'out' }, to: { id: 6, port: 'trg' } }, { from: { id: 5, port: 'out' }, to: { id: 6, port: 'lex' } }, { from: { id: 4, port: 'out' }, to: { id: 5, port: 'algn' } }, { from: { id: 6, port: 'out' }, to: { id: undefined, port: 'model' } }]
    },
    'word-alignment': {
      type: 'word-alignment', title: 'Word alignment', category: 'alignment',
      ports: { input: ['src', 'trg'], output: ['algn'] },
      processes: [{ id: 601, type: 'fastalign', params: { reverse: false }, x: 20, y: 50 }, { id: 602, type: 'fastalign', params: { reverse: true }, x: 200, y: 50 }, { id: 603, type: 'symalign', params: {}, x: 120, y: 200 }],
      links: [{ from: { id: undefined, port: 'src' }, to: { id: 601, port: 'src' } }, { from: { id: undefined, port: 'trg' }, to: { id: 602, port: 'trg' } }, { from: { id: undefined, port: 'src' }, to: { id: 602, port: 'src' } }, { from: { id: undefined, port: 'trg' }, to: { id: 601, port: 'trg' } }, { from: { id: 601, port: 'out' }, to: { id: 603, port: 'srctrg' } }, { from: { id: 602, port: 'out' }, to: { id: 603, port: 'trgsrc' } }, { from: { id: 603, port: 'out' }, to: { id: undefined, port: 'algn' } }]
    },
    evaluation: {
      title: 'Evaluation', type: 'evaluation', category: 'evaluation',
      ports: { input: ['src', 'ref', 'ini'], output: ['trans', 'bleu'] },
      processes: [{ id: 2, type: 'tokenizer', params: { lang: 'en' }, x: 20, y: 175 }, { id: 3, type: 'tokenizer', params: { lang: 'lv' }, x: 200, y: 175 }, { id: 4, type: 'moses', params: {}, x: 50, y: 500, width: 250 }, { id: 5, type: 'detokenizer', params: { lang: 'en' }, x: 150, y: 650 }, { id: 6, type: 'bleu', params: { 'case': false }, x: 350, y: 750 }, { id: 7, type: 'compareval', params: { server: 'http://localhost:8080', experiment: 'testing' }, x: 550, y: 800 }],
      links: [{ from: { id: undefined, port: 'src' }, to: { id: 2, port: 'in' } }, { from: { id: undefined, port: 'ref' }, to: { id: 3, port: 'in' } }, { from: { id: undefined, port: 'ini' }, to: { id: 4, port: 'ini' } }, { from: { id: 2, port: 'out' }, to: { id: 4, port: 'in' } }, { from: { id: 4, port: 'out' }, to: { id: 5, port: 'in' } }, { from: { id: 4, port: 'out' }, to: { id: 6, port: 'trans' } }, { from: { id: undefined, port: 'src' }, to: { id: 6, port: 'src' } }, { from: { id: undefined, port: 'ref' }, to: { id: 6, port: 'ref' } }, { from: { id: 2, port: 'out' }, to: { id: 7, port: 'src' } }, { from: { id: 3, port: 'out' }, to: { id: 7, port: 'ref' } }, { from: { id: 5, port: 'out' }, to: { id: 7, port: 'trans' } }, { from: { id: 5, port: 'out' }, to: { id: undefined, port: 'trans' } }, { from: { id: 6, port: 'out' }, to: { id: undefined, port: 'bleu' } }]
    }
  }
};

var CategoryTitles = {
  'lm': 'Language models',
  'alignment': 'Word alignment',
  'decoder': 'Decoding',
  'corpora': 'Corpora tools',
  'evaluation': 'Evaluation',
  'phrases': 'Phrase based tools',
  'tuning': 'Tuning'
};
"use strict";

var Properties = React.createClass({
  displayName: "Properties",

  mixins: [Reflux.ListenerMixin],

  getInitialState: function getInitialState() {
    return { selected: null };
  },

  componentDidMount: function componentDidMount() {
    this.listenTo(Actions.select, this.onSelect);
  },

  onSelect: function onSelect(obj) {
    this.setState({ selected: obj });
  },

  onChange: function onChange(process, key, value) {
    this.state.selected.params[key] = value;
    this.setState(this.state);
    Actions.paramChanged(process, key, value);
  },

  render: function render() {
    var _this = this;

    var body;
    if (!this.state.selected || !this.state.selected.params) {
      body = React.createElement(
        "div",
        null,
        "Nothing selected"
      );
    } else {
      var p = this.state.selected;
      var children = Object.keys(p.template.params).map(function (key) {
        return React.createElement(
          "tr",
          { key: key },
          React.createElement(
            "th",
            null,
            key
          ),
          React.createElement(
            "td",
            null,
            React.createElement("input", { type: "text", value: p.params[key], onChange: function (e) {
                return _this.onChange(p, key, e.target.value);
              } })
          )
        );
      });
      body = React.createElement(
        "table",
        null,
        React.createElement(
          "tbody",
          null,
          children
        )
      );
    }
    return React.createElement(
      "div",
      null,
      React.createElement(
        "h2",
        null,
        "Properties"
      ),
      body
    );
  }
});
'use strict';

var Server = React.createClass({
  displayName: 'Server',

  mixins: [React.addons.PureRenderMixin, Reflux.ListenerMixin],

  getInitialState: function getInitialState() {
    return { url: null, interval: 1000, timer: null };
  },

  componentDidMount: function componentDidMount() {
    this.listenTo(Actions.runExperiment, this.launch);

    this.setState({ url: document.location.href });
  },

  launch: function launch(doc, resume) {
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
      success: function success(res) {
        return console.log(res);
      }
    };

    $.ajax(request);
  },

  startOrStop: function startOrStop() {
    if (this.state.timer) {
      clearInterval(this.state.timer);
      this.setState({ timer: null });
    } else {
      var doc = this.props.doc;
      var url = this.state.url.replace(/\/+$/, '');
      var workdir = this.props.doc.vars.workdir;
      var check = function check() {
        $.get(url + '/status?workdir=' + encodeURI(workdir), function (result) {
          Actions.updateStatus(doc, result);
        });
      };

      check();
      this.setState({ timer: setInterval(check, this.state.interval) });
    }
  },

  render: function render() {
    var _this = this;

    return React.createElement(
      'div',
      null,
      React.createElement(
        'h2',
        null,
        'Server'
      ),
      React.createElement(
        'table',
        null,
        React.createElement(
          'tbody',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement(
              'th',
              null,
              'URL'
            ),
            React.createElement(
              'td',
              null,
              React.createElement('input', { type: 'text', value: this.state.url, onChange: function (e) {
                  return _this.setState({ url: e.target.value });
                } })
            )
          ),
          React.createElement(
            'tr',
            null,
            React.createElement(
              'th',
              null,
              'Update interval'
            ),
            React.createElement(
              'td',
              null,
              React.createElement('input', { type: 'text', value: this.state.interval, onChange: function (e) {
                  return _this.setState({ interval: e.target.value });
                } })
            )
          ),
          React.createElement(
            'tr',
            null,
            React.createElement(
              'td',
              { colSpan: '2' },
              React.createElement(
                'button',
                { onClick: this.startOrStop },
                !this.state.timer ? 'Start' : 'Stop'
              ),
              React.createElement(
                'button',
                { onClick: function () {
                    return Actions.runExperiment(_this.props.doc);
                  } },
                'Run'
              ),
              React.createElement(
                'button',
                { onClick: function () {
                    return Actions.runExperiment(_this.props.doc, true);
                  } },
                'Resume'
              )
            )
          )
        )
      )
    );
  }
});
"use strict";

var Toolbox = React.createClass({
  displayName: "Toolbox",

  mixins: [React.addons.PureRenderMixin],

  getInitialState: function getInitialState() {
    return { dragging: null };
  },

  dragStart: function dragStart(e, obj) {
    // todo: set image
    this.setState({ dragging: obj });
  },

  dragEnd: function dragEnd(e) {
    if (this.state.dragging) {
      Actions.add(this.state.dragging, e.pageX, e.pageY);
      this.setState({ dragging: null });
    }
  },

  render: function render() {
    var _this = this;

    var all = [];
    for (var i in Tools.processes) all.push(Tools.processes[i]);
    for (var i in Tools.groups) all.push(Tools.groups[i]);

    var children = all.map(function (p) {
      return p.category;
    }).filter(function (g, i, arr) {
      return arr.lastIndexOf(g) === i;
    }).map(function (cat) {
      return React.createElement(
        "div",
        { key: cat, className: "toolbox-group" },
        React.createElement(
          "h3",
          null,
          CategoryTitles[cat] || cat
        ),
        React.createElement(
          "ul",
          null,
          all.filter(function (p) {
            return p.category == cat;
          }).map(function (p) {
            return React.createElement(
              "li",
              { key: cat + '/' + p.type,
                draggable: "true",
                onDragStart: function (e) {
                  return _this.dragStart(e, p);
                },
                onDragEnd: _this.dragEnd },
              p.title || p.type
            );
          })
        )
      );
    });

    return React.createElement(
      "div",
      null,
      React.createElement(
        "h2",
        null,
        "Toolbox"
      ),
      children
    );
  }
});
"use strict";

var Variables = React.createClass({
  displayName: "Variables",

  //mixins: [React.addons.PureRenderMixin],

  onChange: function onChange(key, value) {
    Actions.variableChanged(key, value);
  },

  onAdd: function onAdd() {
    this.onChange(this.refs.key.value, this.refs.value.value);
    this.refs.key.value = this.refs.value.value = '';
  },

  onEnter: function onEnter(e) {
    if (e.keyCode == 13) {
      this.onAdd();
    }
  },

  render: function render() {
    var _this = this;

    var children = Object.keys(this.props.vars).map(function (key) {
      return React.createElement(
        "tr",
        { key: key },
        React.createElement(
          "th",
          null,
          key
        ),
        React.createElement(
          "td",
          null,
          React.createElement("input", { type: "text", value: _this.props.vars[key], onChange: function (e) {
              return _this.onChange(key, e.target.value);
            } })
        )
      );
    });

    return React.createElement(
      "div",
      null,
      React.createElement(
        "h2",
        null,
        "Variables"
      ),
      React.createElement(
        "table",
        null,
        React.createElement(
          "tbody",
          null,
          children,
          React.createElement(
            "tr",
            null,
            React.createElement(
              "th",
              null,
              React.createElement("input", { type: "text", ref: "key", onKeyUp: this.onEnter })
            ),
            React.createElement(
              "td",
              null,
              React.createElement("input", { type: "text", ref: "value", onKeyUp: this.onEnter })
            )
          )
        )
      )
    );
  }
});
