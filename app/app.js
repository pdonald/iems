"use strict";

var Actions = {
  add: Reflux.createAction(),
  "delete": Reflux.createAction(),
  move: Reflux.createAction(),
  connect: Reflux.createAction(),
  select: Reflux.createAction(),
  goIntoGroup: Reflux.createAction(),
  portSelected: Reflux.createAction(),
  portDeselected: Reflux.createAction(),
  paramChanged: Reflux.createAction(),
  viewFile: Reflux.createAction(),
  variableChanged: Reflux.createAction()
};
'use strict';

var App = React.createClass({
  displayName: 'App',

  getInitialState: function getInitialState() {
    var doc = {
      name: 'Experiment #1',
      vars: { srclang: 'en', trglang: 'lv', 'lm-order': 5, toolsdir: '/tools', workdir: '/tools/train', tempdir: '/tmp' },
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

    this.clipboard = new ZeroClipboard(this.refs.copyMakefileButton);

    //setInterval(() => this.updateStatus(), 1000);
  },

  updateStatus: function updateStatus() {
    var _this2 = this;

    console.log('updating status');
    $.get('/status', function (result) {
      _this2.currentDoc().status = result;
      _this2.setState(_this2.state);
    });
  },

  onViewFile: function onViewFile(info) {
    var _this3 = this;

    if (info.type != 'out') return;
    if (info.group.id == info.process.id) return;

    var filename = info.process.name + '-g' + info.group.id + 'p' + info.process.id + '.' + info.label;

    this.state.modal.title = filename;
    this.state.modal.open = true;
    this.setState({ modal: this.state.modal });

    $.get('/file?name=' + filename, function (result) {
      _this3.state.modal.content = result;
      _this3.setState({ modal: _this3.state.modal });
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
          width: template.width || 150, height: template.height || 50,
          type: template.type, params: {}
        });
      }
      this.setState(this.state);
    }
  },

  onSelect: function onSelect(obj) {
    obj.selected = !obj.selected;
    this.setState(this.state);
  },

  onGoIntoGroup: function onGoIntoGroup(obj) {
    // prevents double click bugs
    if (obj == this.currentDoc().stack[0]) return;
    if (obj == this.currentDoc().stack[this.currentDoc().stack.length - 1]) return;

    if (obj.getSize) {
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

  addDoc: function addDoc() {
    var doc = {
      name: 'Experiment #' + (this.state.documents.length + 1),
      vars: { srclang: 'en', trglang: 'lv', 'lm-order': 5, toolsdir: '/tools', workdir: '/tools/train', tempdir: '/tmp' },
      stack: []
    };

    doc.stack.push(new GroupModel({ id: 0, type: 'main', title: 'Main', x: 0, y: 0 }, null, doc));

    this.state.documents.push(doc);
    this.state.currentDocument = this.state.documents.length - 1;
    this.setState(this.state);
  },

  cloneDoc: function cloneDoc(doc) {
    var clone = JSON.parse(JSON.stringify(doc));
    clone.name += ' (clone)';
    clone.stack = [new GroupX(clone.stack[0])];
    this.state.documents.push(clone);
    this.state.currentDocument = this.state.documents.length - 1;
    this.setState(this.state);
  },

  currentDoc: function currentDoc() {
    return this.state.documents[this.state.currentDocument];
  },

  goToDoc: function goToDoc(index) {
    this.state.currentDocument = index;
    this.setState(this.state);
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

  runExp: function runExp() {
    $.ajax({ type: 'POST', url: '/run', data: this.getMakefile(), contentType: 'text/plain' }, function (res) {
      console.log(res);
    });
  },

  getMakefile: function getMakefile() {
    return genMakefile(this.currentGraph(), this.currentDoc().stack[0]);
  },

  render: function render() {
    var _this4 = this;

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
                return _this4.setState({ modal: { open: false } });
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
                            this.state.documents.map(function (doc, index) {
                              return React.createElement(
                                'li',
                                { className: index == _this4.state.currentDocument ? 'active' : '', key: index, onClick: function () {
                                    return _this4.goToDoc(index);
                                  } },
                                doc.name
                              );
                            }),
                            React.createElement(
                              'li',
                              { className: 'right', onClick: function () {
                                  return _this4.cloneDoc(_this4.currentDoc());
                                } },
                              'Clone'
                            ),
                            React.createElement(
                              'li',
                              { className: 'right', onClick: this.addDoc },
                              'New'
                            )
                          )
                        ),
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
                                    return _this4.goTo(index);
                                  } },
                                g.title || g.name || '#' + g.id
                              );
                            }),
                            React.createElement(
                              'li',
                              { className: 'run right', onClick: this.runExp },
                              'Run'
                            )
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
                                React.createElement('input', { type: 'radio', readOnly: true, name: 'outtype', checked: _this4.state.output == key ? 'checked' : '', onClick: function (e) {
                                    return _this4.changeOutputType(key);
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
  processes: [{ id: 1, x: 214, y: 178, width: 150, height: 50, type: 'opus', params: {} }, { id: 2, x: 150, y: 334, width: 150, height: 50, type: 'tokenizer', params: {} }, { id: 3, x: 451, y: 333, width: 150, height: 50, type: 'tokenizer', params: {} }],
  links: [{ from: { id: 1, port: 'src' }, to: { id: 2, port: 'in' } }, { from: { id: 1, port: 'trg' }, to: { id: 3, port: 'in' } }, { from: { id: 2, port: 'out' }, to: { id: 4, port: 'src' } }, { from: { id: 3, port: 'out' }, to: { id: 4, port: 'trg' } }, { from: { id: 3, port: 'out' }, to: { id: 5, port: 'trg' } }],
  groups: [{
    id: 4, title: 'Word alignment', type: 'word-alignment', category: 'alignment',
    x: 194, y: 553, collapsed: true,
    ports: { 'in': ['src', 'trg'], out: ['algn'] },
    processes: [{ id: 601, x: 20, y: 50, width: 150, height: 50, type: 'fastalign', params: {} }, { id: 602, x: 200, y: 50, width: 150, height: 50, type: 'fastalign', params: {} }, { id: 603, x: 120, y: 200, width: 150, height: 50, type: 'symalign', params: {} }],
    links: [{ from: { id: 4, port: 'src' }, to: { id: 601, port: 'src' } }, { from: { id: 4, port: 'trg' }, to: { id: 602, port: 'trg' } }, { from: { id: 4, port: 'src' }, to: { id: 602, port: 'src' } }, { from: { id: 4, port: 'trg' }, to: { id: 601, port: 'trg' } }, { from: { id: 601, port: 'out' }, to: { id: 603, port: 'srctrg' } }, { from: { id: 602, port: 'out' }, to: { id: 603, port: 'trgsrc' } }, { from: { id: 603, port: 'out' }, to: { id: 4, port: 'algn' } }]
  }, {
    id: 5, title: 'Language model', type: 'lm-kenlm', category: 'lm',
    x: 532, y: 535, collapsed: true,
    ports: { 'in': ['trg'], out: ['lm'] },
    processes: [{ id: 2, x: 20, y: 50, width: 150, height: 50, type: 'kenlm', params: {} }, { id: 3, x: 20, y: 175, width: 150, height: 50, type: 'binarpa', params: {} }],
    links: [{ from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } }, { from: { id: 5, port: 'trg' }, to: { id: 2, port: 'in' } }, { from: { id: 3, port: 'out' }, to: { id: 5, port: 'lm' } }]
  }]
};

AppDefaultGraph = {
  id: 0, title: 'Main', type: 'main', category: 'undefined',
  x: 0, y: 0, collapsed: false,
  processes: [{ id: 1, x: 214, y: 178, width: 150, height: 50, type: 'opus', params: { srclang: "$srclang", trglang: "$trglang" } }, { id: 6, x: 456, y: 183, width: 150, height: 50, type: 'opus', params: { srclang: "$srclang", trglang: "$trglang" } }]
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
"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var Graph = React.createClass({
  displayName: "Graph",

  mixins: [React.addons.PureRenderMixin],

  componentDidMount: function componentDidMount() {
    this.refs.container.focus();
  },

  onKeyDown: function onKeyDown(e) {
    if (e.keyCode == 46) {
      Actions["delete"]();
    }
  },

  render: function render() {
    var size = this.props.graph.getCalculatedSize();
    return React.createElement(
      "div",
      { ref: "container", onKeyDown: this.onKeyDown, style: { height: '100%' }, tabIndex: "0" },
      React.createElement(
        "svg",
        _extends({ style: { width: size.width + 25 + 'px', height: size.height + 100 + 'px' } }, this.props),
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
    var width = obj.width;
    var height = obj.height;
    if (obj.getSize) {
      var size = obj.collapsed ? { width: 150, height: 50 } : obj.getCalculatedSize();
      width = size.width;
      height = size.height;
    }

    var x = self ? 0 : obj.x;
    var y = self ? 0 : obj.y;
    if (self) dir = dir == 'in' ? 'out' : 'in';

    var ports = obj.ports;
    if (!ports && obj.template) {
      ports = {
        'in': Object.keys(obj.template.input),
        out: Object.keys(obj.template.output)
      };
    }

    x += (ports[dir].indexOf(portName) + 1) * (width / (ports[dir].length + 1));
    y += dir == 'out' ? height : 0;
    y += (dir == 'out' ? 10 : -10) * (self ? -1 : 1);

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
        var ports = { 'in': Object.keys(p.template.input), out: Object.keys(p.template.output) };
        return React.createElement(Process, { width: p.width, height: p.height, x: p.x, y: p.y,
          graph: p, title: p.getTitle(), key: p.getKey(), selected: p.selected,
          ports: ports });
      });

      var links = group.links.map(function (l) {
        var source = _this.getPortPosition(group.getChildById(l.from.id), l.from.port, 'out', l.from.id == group.id);
        var target = _this.getPortPosition(group.getChildById(l.to.id), l.to.port, 'in', l.to.id == group.id);
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
      var size = { width: 150, height: 50 };
      return React.createElement(Process, { width: size.width, height: size.height, x: group.x, y: group.y,
        title: group.getTitle(), graph: group, selected: group.selected,
        ports: group.ports });
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
        { x: +this.props.x - this.props.label.length * 2, y: +this.props.y + (this.props.type == 'in' ? -20 : 30) },
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
    return { ports: { 'in': [], out: [] }, draggable: true, x: 0, y: 0 };
  },

  onMove: function onMove(pos) {
    Actions.move(pos, this.props.graph, this.props.parent);
  },

  onClick: function onClick(e) {
    Actions.select(this.props.graph);
  },

  goIntoGroup: function goIntoGroup(e) {
    Actions.goIntoGroup(this.props.graph);
    e.preventDefault();
    e.stopPropagation();
  },

  portName: function portName(process, type, port) {
    if (process.template) {
      var portinfo = process.template[type][port];
      if (portinfo.title) {
        return portinfo.title(process, resolveParams(process.params, process.group.doc.vars));
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
      x: width / (ports['in'].length + 1),
      y: width / (ports.out.length + 1)
    };

    var classes = ['process'];
    if (this.props.blank) classes.push('blank');
    if (this.props.main) classes.push('main');
    if (this.props.selected) classes.push('selected');

    var padding = 10;
    var min = { x: padding, y: padding };

    return React.createElement(
      Draggable,
      { className: classes.join(' '),
        pos: { x: this.props.x, y: this.props.y }, min: min,
        onMove: this.onMove },
      React.createElement(
        'g',
        null,
        React.createElement('rect', { className: 'process-rect', x: '0', y: '0', width: width, height: height, onDoubleClick: this.onClick }),
        React.createElement(
          'g',
          { className: this.props.graph.collapsed ? 'zoom-in' : '', onClick: this.goIntoGroup },
          React.createElement(
            'text',
            { x: '10', y: '30' },
            this.props.title
          )
        ),
        React.createElement(
          'g',
          null,
          ports['in'].map(function (port, index) {
            return React.createElement(Port, { process: _this.props.graph, group: _this.props.group, key: port, port: port, label: _this.portName(_this.props.graph, 'input', port), type: 'in', x: (index + 1) * offset.x, y: 0 });
          })
        ),
        React.createElement(
          'g',
          null,
          ports.out.map(function (port, index) {
            return React.createElement(Port, { process: _this.props.graph, group: _this.props.group, key: port, port: port, label: _this.portName(_this.props.graph, 'output', port), type: 'out', x: (index + 1) * offset.y, y: height });
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
      group.links.forEach(function (l) {
        if (!l.from.id) l.from.id = group.id;
        if (!l.to.id) l.to.id = group.id;
      });

      this.groups.push(new GroupModel(group, this, this.doc));
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
        return { width: 150, height: 50 };
      } else {
        return this.getCalculatedSize();
      }
    }
  }, {
    key: 'getCalculatedSize',
    value: function getCalculatedSize() {
      var size = { width: this.x, height: this.y };
      var padding = 50;
      this.groups.forEach(function (g) {
        var groupSize = g.collapsed ? g.getSize() : g.getCalculatedSize();
        if (g.x + groupSize.width + padding > size.width) size.width = g.x + groupSize.width + padding;
        if (g.y + groupSize.height + padding > size.height) size.height = g.y + groupSize.height + padding;
      });
      this.processes.forEach(function (p) {
        if (p.x + p.width + padding > size.width) size.width = p.x + p.width + padding;
        if (p.y + p.height + padding > size.height) size.height = p.y + p.height + padding;
      });
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
  }]);

  return GroupModel;
})();
'use strict';

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

function hashFnv32a(str, asString, seed) {
  /*jshint bitwise:false */
  var i,
      l,
      hval = seed === undefined ? 0x811c9dc5 : seed;

  for (i = 0, l = str.length; i < l; i++) {
    hval ^= str.charCodeAt(i);
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  if (asString) {
    // Convert to 8 digit hex string
    return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
  }
  return hval >>> 0;
}

var Output = {
  Nothing: function Nothing() {
    return '';
  },

  JSON: function JSON(graph, depth) {
    function params2str(params) {
      var arr = [];
      for (var key in params) {
        arr.push(key + ': "' + params[key].replace('"', '\\"') + '"');
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
    if (graph.ports) json += pad + ('ports: { in: [\'' + graph.ports['in'].join("', '") + '\'], out: [\'' + graph.ports.out.join("', '") + '\'] },') + '\n';

    // processes data
    json += pad + 'processes: [' + '\n';
    json += graph.processes.map(function (p) {
      return '{ id: ' + p.id + ', x: ' + p.x + ', y: ' + p.y + ', width: ' + p.width + ', height: ' + p.height + ', type: \'' + p.type + '\', params: { ' + params2str(p.params) + ' } }';
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
    function processName(p, port) {
      var hash = hashFnv32a(p.getHashKey(), true);
      return p.type + '-' + hash + (port ? '.' + port : '');
    }

    var text = '';

    var root = !all;
    if (root) all = [];

    graph.processes.forEach(function (p) {
      var input = {};
      var output = {};
      var noOutput = null;

      Object.keys(p.template.output).forEach(function (key) {
        output[key] = processName(p, key);
        all.push(output[key]);
      });

      if (Object.keys(output).length == 0) {
        noOutput = processName(p, 'done');
        all.push(noOutput);
      }

      graph.links.filter(function (l) {
        return l.to.id == p.id;
      }).forEach(function (l) {
        var result = graph.resolveLinkInput(l);
        if (result) {
          input[l.to.port] = processName(result.process, result.port);
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
      text += '\t' + ('touch status.' + processName(p, 'running')) + '\n';
      text += '\t' + p.template.toBash(resolveParams(p.params, p.group.doc.vars), input, output).join('\n\t') + '\n';
      if (noOutput) text += '\ttouch ' + noOutput + '\n';
      text += '\t' + ('mv status.' + processName(p, 'running') + ' status.' + processName(p, 'done')) + '\n';
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
    key: 'getTitle',
    value: function getTitle() {
      if (this.title) return this.title;
      if (this.template.toTitle) return this.template.toTitle(this, resolveParams(this.params, this.group.doc.vars));
      if (this.template.title) return this.template.title;
      return this.type;
    }
  }, {
    key: 'getInput',
    value: function getInput() {
      var _this = this;

      var link = this.group.links.filter(function (l) {
        return l.to.id == _this.id;
      })[0];
      if (link && link.process) return this.group.resolveLinkInput(link).process;
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
      var params = resolveParams(this.params, this.group.doc.vars);
      for (var name in this.template.params) {
        if (this.template.params[name].nohash) continue;
        if (name in params) {
          key.push('param:' + name + '=' + params[name]);
        }
      }
      var prev = this.getInput();
      return (prev ? prev.getHashKey() : '<root>') + ' -> ' + key.join(';');
    }
  }], [{
    key: 'isLinkValid',
    value: function isLinkValid(a, b) {
      var atype = a.type || a;
      var btype = b.type || b;
      //console.log(atype, btype)
      return atype == btype;
    }
  }]);

  return ProcessModel;
})();
'use strict';

var Tools = {
  processes: {
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
        trglang: { type: 'language', 'default': '$trglang' }
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
        return ['TEMP=$(shell mktemp) && \\', 'wget http://opus.lingfil.uu.se/' + params.corpus + '/' + params.srclang + '-' + params.trglang + '.txt.zip -O $$TEMP && \\', 'unzip -p $$TEMP ' + params.corpus + '.' + params.srclang + '-' + params.trglang + '.' + params.srclang + ' > ' + output.src + ' && \\', 'unzip -p $$TEMP ' + params.corpus + '.' + params.srclang + '-' + params.trglang + '.' + params.trglang + ' > ' + output.trg + ' && \\', 'rm $$TEMP'];
      }
    },
    tokenizer: {
      type: 'tokenizer', title: 'Tokenizer (moses)', category: 'corpora',
      params: { lang: { type: 'language', 'default': '$srclang' } },
      input: { 'in': 'file<text>' },
      output: { out: 'file<tok>' },
      toTitle: function toTitle(p, params) {
        return params.lang ? 'Tokenizer [' + params.lang + '] (moses)' : p.title;
      },
      toBash: function toBash(params, input, output) {
        return ['perl /tools/scripts/tokenizer/tokenizer.perl -l ' + params.lang + ' < ' + input['in'] + ' > ' + output.out];
      }
    },
    kenlm: {
      type: 'kenlm', title: 'KenLM', category: 'lm',
      params: {
        order: { type: 'uinteger', 'default': '$lm-order' },
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
        return [params.toolsdir + '/lmplz -o ' + params.order + ' ' + args.join(' ') + ' < ' + input['in'] + ' > ' + output.out];
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
        return [params.toolsdir + '/build_binary ' + params.type + ' ' + args.join(' ') + ' ' + input['in'] + ' ' + output.out];
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
        return ['TEMP=$(shell mktemp --tmpdir=' + params.tempdir + ') && \\', params.toolsdir + '/prep_fast_align ' + input.src + ' ' + input.trg + ' > $$TEMP && \\', params.toolsdir + '/fast_align ' + (params.reverse ? '-r' : '') + ' -i $$TEMP > ' + output.out + ' && \\', 'rm $$TEMP'];
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
        return [params.toolsdir + '/atools -c ' + params.method + ' -i ' + input.srctrg + ' -j ' + input.trgsrc + ' > ' + output.out];
      }
    },
    phrases: {
      type: 'phrases', category: 'phrases',
      params: { maxLength: 'int', model: 'string' },
      input: { src: 'file<tok>', trg: 'file<tok>', algn: 'file<align>' },
      output: { out: 'file<phrases>', inv: 'file<phrases>', o: 'file<any>' },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d) && \\', '/tools/extract ' + input.trg + ' ' + input.src + ' ' + input.algn + ' $$TEMP/extract ' + params.maxLength + ' orientation --model ' + params.model + ' && \\', 'LC_ALL=C sort $$TEMP/extract -T $$TEMP > ' + output.out + ' && \\', 'LC_ALL=C sort $$TEMP/extract.inv -T $$TEMP > ' + output.inv + ' && \\', 'LC_ALL=C sort $$TEMP/extract.o -T $$TEMP > ' + output.o + ' && \\', 'rm -r $$TEMP'];
      }
    },
    lexical: {
      type: 'lexical', category: 'phrases',
      params: {},
      input: { src: 'file<tok>', trg: 'file<tok>', algn: 'file<align>' },
      output: { srctrg: 'file<lex>', trgsrc: 'file<lex>' },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d) && \\', 'perl /tools/scripts/training/get-lexical.perl ' + input.src + ' ' + input.trg + ' ' + input.algn + ' $$TEMP/lex && \\', 'mv $$TEMP/lex.e2f ' + output.srctrg + ' && \\', 'mv $$TEMP/lex.f2e ' + output.trgsrc + ' && \\', 'rm -r $$TEMP'];
      }
    },
    phrasescore: {
      type: 'phrasescore', category: 'phrases',
      params: {},
      input: { phr: 'file<phrases>', phrinv: 'file<phrases>', srctrg: 'file<lex>', trgsrc: 'file<lex>' },
      output: { ptable: 'file<phrase-table>' },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d) && \\', '/tools/score ' + input.phr + ' ' + input.trgsrc + ' /dev/stdout > $$TEMP/trgsrc && \\', '/tools/score ' + input.phrinv + ' ' + input.srctrg + ' /dev/stdout --Inverse > $$TEMP/srctrg && \\', 'LC_ALL=C sort $$TEMP/srctrg -T $$TEMP | gzip > $$TEMP/srctrg.sorted.gz && \\', 'LC_ALL=C sort $$TEMP/trgsrc -T $$TEMP | gzip > $$TEMP/trgsrc.sorted.gz && \\', '/tools/consolidate $$TEMP/trgsrc.sorted.gz $$TEMP/srctrg.sorted.gz ' + output.ptable + ' && \\', 'rm -r $$TEMP'];
      }
    },
    phrasesbin: {
      type: 'phrasesbin', category: 'phrases',
      input: { ptable: 'file<phrase-table>' },
      output: { minphr: 'file<phrase-table-bin>' },
      toBash: function toBash(params, input, output) {
        return ['/tools/processPhraseTableMin -nscores 4 -threads 1 -in ' + input.ptable + ' -out ' + output.minphr];
      }
    },

    //`mv ${output.bin}.minphr ${output.bin}`
    reordering: {
      type: 'reordering', category: 'phrases',
      params: { model: 'string', type: 'string', orientation: 'string', smoothing: 'float' },
      input: { phr: 'file<any>' },
      output: { reord: 'file<reordering>' },
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d) && \\', '/tools/lexical-reordering-score ' + input.phr + ' ' + params.smoothing + ' $$TEMP/output. --model "' + params.type + ' ' + params.orientation + ' ' + params.model + '" && \\', 'zcat $$TEMP/output.' + params.model + '.gz > ' + output.reord + ' && \\', 'rm -r $$TEMP'];
      }
    },
    reorderingbin: {
      type: 'reorderingbin', category: 'phrases',
      input: { reord: 'file<reordering>' },
      output: { minlexr: 'file<reordering-bin>' },
      toBash: function toBash(params, input, output) {
        return ['/tools/processLexicalTableMin -threads 1 -in ' + input.reord + ' -out ' + output.minlexr];
      }
    },

    //`mv ${output.reord}.minlexr ${output.reord}`
    echo: {
      type: 'echo', category: 'corpora',
      input: {},
      output: { out: 'file<text>' },
      params: { text: 'string' },
      toBash: function toBash(params, input, output) {
        return ['echo "' + params.text + '" > ' + output.out];
      }
    },
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
    detokenizer: {
      type: 'detokenizer', title: 'Detokenizer (moses)', category: 'corpora',
      input: { 'in': 'file<tok>' },
      output: { out: 'file<text>' },
      params: { lang: 'language' },
      toBash: function toBash(params, input, output) {
        return ['perl /tools/scripts/tokenizer/detokenizer.perl -l ' + params.lang + ' < ' + input['in'] + ' > ' + output.out];
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
      params: {},
      toBash: function toBash(params, input, output) {
        return ['rm -rf ' + output.out, 'mkdir ' + output.out, '/tools/mtt-build -i -o ' + output.out + '/corpus < ' + input['in']];
      }
    },
    binalign: {
      type: 'binalign', title: 'Binarize align', category: 'phrases',
      input: { 'in': 'file<align>' },
      output: { out: 'file<bin>' },
      params: {},
      toBash: function toBash(params, input, output) {
        return ['/tools/symal2mam ' + output.out + ' < ' + input['in']];
      }
    },
    binlex: {
      type: 'binlex', title: 'Binarize lex', category: 'phrases',
      input: { src: 'dir<bin>', trg: 'dir<bin>', algn: 'file<bin>' },
      output: { out: 'file<bin>' },
      params: {},
      toBash: function toBash(params, input, output) {
        return ['TEMP=$(shell mktemp -d) && \\', 'ln -s `readlink -f ' + input.src + '/corpus.mct` $$TEMP/corpus.src.mct && \\', 'ln -s `readlink -f ' + input.src + '/corpus.sfa` $$TEMP/corpus.src.sfa && \\', 'ln -s `readlink -f ' + input.src + '/corpus.tdx` $$TEMP/corpus.src.tdx && \\', 'ln -s `readlink -f ' + input.trg + '/corpus.mct` $$TEMP/corpus.trg.mct && \\', 'ln -s `readlink -f ' + input.trg + '/corpus.sfa` $$TEMP/corpus.trg.sfa && \\', 'ln -s `readlink -f ' + input.trg + '/corpus.tdx` $$TEMP/corpus.trg.tdx && \\', 'ln -s `readlink -f ' + input.algn + '` $$TEMP/corpus.src-trg.mam && \\', '/tools/mmlex-build $$TEMP/corpus. src trg -o ' + output.out + ' && \\', 'rm -rf $$TEMP'];
      }
    },
    psamplemodel: {
      type: 'psamplemodel', title: 'Sampling model', category: 'phrases',
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
      ports: { 'in': ['trg'], out: ['lm'] },
      processes: [{ id: 2, type: 'kenlm', params: {}, x: 20, y: 50, width: 150, height: 50 }, { id: 3, type: 'binarpa', params: {}, x: 20, y: 175, width: 150, height: 50 }],
      links: [{ from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } }, { from: { id: undefined, port: 'trg' }, to: { id: 2, port: 'in' } }, { from: { id: 3, port: 'out' }, to: { id: undefined, port: 'lm' } }]
    },
    'phrasesampling': {
      type: 'phrasesampling', title: 'Sampling Phrases', category: 'phrases',
      ports: { 'in': ['src', 'trg', 'algn'], out: ['model'] },
      processes: [{ id: 2, type: 'bintext', params: {}, x: 20, y: 50, width: 150, height: 50 }, { id: 3, type: 'bintext', params: {}, x: 20, y: 175, width: 150, height: 50 }, { id: 4, type: 'binalign', params: {}, x: 20, y: 375, width: 150, height: 50 }, { id: 5, type: 'binlex', params: {}, x: 20, y: 475, width: 150, height: 50 }, { id: 6, type: 'psamplemodel', params: {}, x: 20, y: 575, width: 150, height: 50 }],
      links: [{ from: { id: undefined, port: 'src' }, to: { id: 2, port: 'in' } }, { from: { id: undefined, port: 'trg' }, to: { id: 3, port: 'in' } }, { from: { id: undefined, port: 'algn' }, to: { id: 4, port: 'in' } }, { from: { id: 2, port: 'out' }, to: { id: 5, port: 'src' } }, { from: { id: 3, port: 'out' }, to: { id: 5, port: 'trg' } }, { from: { id: 4, port: 'out' }, to: { id: 6, port: 'algn' } }, { from: { id: 2, port: 'out' }, to: { id: 6, port: 'src' } }, { from: { id: 3, port: 'out' }, to: { id: 6, port: 'trg' } }, { from: { id: 5, port: 'out' }, to: { id: 6, port: 'lex' } }, { from: { id: 4, port: 'out' }, to: { id: 5, port: 'algn' } }, { from: { id: 6, port: 'out' }, to: { id: undefined, port: 'model' } }]
    },
    'word-alignment': {
      type: 'word-alignment', title: 'Word alignment', category: 'alignment',
      ports: { 'in': ['src', 'trg'], out: ['algn'] },
      processes: [{ id: 601, type: 'fastalign', params: { reverse: false }, x: 20, y: 50, width: 150, height: 50 }, { id: 602, type: 'fastalign', params: { reverse: true }, x: 200, y: 50, width: 150, height: 50 }, { id: 603, type: 'symalign', params: {}, x: 120, y: 200, width: 150, height: 50 }],
      links: [{ from: { id: undefined, port: 'src' }, to: { id: 601, port: 'src' } }, { from: { id: undefined, port: 'trg' }, to: { id: 602, port: 'trg' } }, { from: { id: undefined, port: 'src' }, to: { id: 602, port: 'src' } }, { from: { id: undefined, port: 'trg' }, to: { id: 601, port: 'trg' } }, { from: { id: 601, port: 'out' }, to: { id: 603, port: 'srctrg' } }, { from: { id: 602, port: 'out' }, to: { id: 603, port: 'trgsrc' } }, { from: { id: 603, port: 'out' }, to: { id: undefined, port: 'algn' } }]
    },
    evaluation: {
      title: 'Evaluation', type: 'evaluation', category: 'evaluation',
      ports: { 'in': ['src', 'ref', 'ini'], out: ['trans', 'bleu'] },
      processes: [{ id: 2, type: 'tokenizer', params: { lang: 'en' }, x: 20, y: 175, width: 150, height: 50 }, { id: 3, type: 'tokenizer', params: { lang: 'lv' }, x: 200, y: 175, width: 150, height: 50 }, { id: 4, type: 'moses', params: {}, x: 50, y: 500, width: 250, height: 50 }, { id: 5, type: 'detokenizer', params: { lang: 'en' }, x: 150, y: 650, width: 150, height: 50 }, { id: 6, type: 'bleu', params: { 'case': false }, x: 350, y: 750, width: 150, height: 50 }, { id: 7, type: 'compareval', params: { server: 'http://localhost:8080', experiment: 'testing' }, x: 550, y: 800, width: 150, height: 50 }],
      links: [{ from: { id: undefined, port: 'src' }, to: { id: 2, port: 'in' } }, { from: { id: undefined, port: 'ref' }, to: { id: 3, port: 'in' } }, { from: { id: undefined, port: 'ini' }, to: { id: 4, port: 'ini' } }, { from: { id: 2, port: 'out' }, to: { id: 4, port: 'in' } }, { from: { id: 4, port: 'out' }, to: { id: 5, port: 'in' } }, { from: { id: 4, port: 'out' }, to: { id: 6, port: 'trans' } }, { from: { id: undefined, port: 'src' }, to: { id: 6, port: 'src' } }, { from: { id: undefined, port: 'ref' }, to: { id: 6, port: 'ref' } }, { from: { id: 2, port: 'out' }, to: { id: 7, port: 'src' } }, { from: { id: 3, port: 'out' }, to: { id: 7, port: 'ref' } }, { from: { id: 5, port: 'out' }, to: { id: 7, port: 'trans' } }, { from: { id: 5, port: 'out' }, to: { id: undefined, port: 'trans' } }, { from: { id: 6, port: 'out' }, to: { id: undefined, port: 'bleu' } }]
    },
    'phrase-extraction': {
      type: 'phrase-extraction', title: 'Phrase extraction', category: 'phrases',
      "processes": [{
        "id": 777,
        "name": "phrases",
        "params": {
          "model": "wbe-msd",
          "maxLength": 7
        },
        "x": 45,
        "y": 96,
        "width": 150,
        "height": 50
      }, {
        "id": 1088,
        "name": "phrasescore",
        "params": {},
        "x": 27,
        "y": 246,
        "width": 250,
        "height": 50
      }, {
        "id": 1882,
        "name": "phrasesbin",
        "params": {},
        "x": 64,
        "y": 418,
        "width": 150,
        "height": 50
      }, {
        "id": 888,
        "name": "reordering",
        "params": {
          "type": "wbe",
          "orientation": "msd",
          "model": "wbe-msd-bidirectional-fe",
          "smoothing": 0.5
        },
        "x": 368,
        "y": 198,
        "width": 150,
        "height": 50,
        "selected": false
      }, {
        "id": 1188,
        "name": "reorderingbin",
        "params": {},
        "x": 373,
        "y": 335,
        "width": 150,
        "height": 50
      }, {
        "id": 988,
        "name": "lexical",
        "params": {},
        "x": 242,
        "y": 69,
        "width": 150,
        "height": 50
      }],
      "links": [{
        "from": {
          "id": 777,
          "port": "out"
        },
        "to": {
          "id": 1088,
          "port": "phr"
        }
      }, {
        "from": {
          "id": 777,
          "port": "inv"
        },
        "to": {
          "id": 1088,
          "port": "phrinv"
        }
      }, {
        "from": {
          "id": 988,
          "port": "srctrg"
        },
        "to": {
          "id": 1088,
          "port": "srctrg"
        }
      }, {
        "from": {
          "id": 777,
          "port": "o"
        },
        "to": {
          "id": 888,
          "port": "phr"
        }
      }, {
        "from": {
          "id": 988,
          "port": "trgsrc"
        },
        "to": {
          "id": 1088,
          "port": "trgsrc"
        }
      }, {
        "from": {
          "id": 888,
          "port": "reord"
        },
        "to": {
          "id": 1188,
          "port": "reord"
        }
      }, {
        "from": {
          "id": 1088,
          "port": "ptable"
        },
        "to": {
          "id": 1882,
          "port": "ptable"
        }
      }, {
        "from": {
          "id": 1882,
          "port": "minphr"
        },
        "to": {
          "id": undefined,
          "port": "minphr"
        }
      }, {
        "from": {
          "id": 1188,
          "port": "minlexr"
        },
        "to": {
          "id": undefined,
          "port": "minlexr"
        }
      }, {
        "from": {
          "id": undefined,
          "port": "src"
        },
        "to": {
          "id": 777,
          "port": "src"
        }
      }, {
        "from": {
          "id": undefined,
          "port": "trg"
        },
        "to": {
          "id": 777,
          "port": "trg"
        }
      }, {
        "from": {
          "id": undefined,
          "port": "src"
        },
        "to": {
          "id": 988,
          "port": "src"
        }
      }, {
        "from": {
          "id": undefined,
          "port": "trg"
        },
        "to": {
          "id": 988,
          "port": "trg"
        }
      }, {
        "from": {
          "id": undefined,
          "port": "algn"
        },
        "to": {
          "id": 988,
          "port": "algn"
        }
      }, {
        "from": {
          "id": undefined,
          "port": "algn"
        },
        "to": {
          "id": 777,
          "port": "algn"
        }
      }],
      "ports": {
        "in": ["src", "trg", "algn"],
        "out": ["minphr", "minlexr"]
      }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzL0FjdGlvbnMuanMiLCJqcy9BcHAuanMiLCJqcy9BcHBEZWZhdWx0R3JhcGguanMiLCJqcy9ncmFwaC9Db25uZWN0b3IuanMiLCJqcy9ncmFwaC9EcmFnZ2FibGUuanMiLCJqcy9ncmFwaC9HcmFwaC5qcyIsImpzL2dyYXBoL0dyb3VwLmpzIiwianMvZ3JhcGgvUG9ydC5qcyIsImpzL2dyYXBoL1Byb2Nlc3MuanMiLCJqcy9tb2RlbC9Hcm91cE1vZGVsLmpzIiwianMvbW9kZWwvT3V0cHV0LmpzIiwianMvbW9kZWwvUHJvY2Vzc01vZGVsLmpzIiwianMvbW9kZWwvVG9vbHMuanMiLCJqcy9Qcm9wZXJ0aWVzLmpzIiwianMvVG9vbGJveC5qcyIsImpzL1ZhcmlhYmxlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLElBQUksT0FBTyxHQUFHO0FBQ1osS0FBRyxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUU7QUFDMUIsWUFBUSxNQUFNLENBQUMsWUFBWSxFQUFFO0FBQzdCLE1BQUksRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFO0FBQzNCLFNBQU8sRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFO0FBQzlCLFFBQU0sRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFO0FBQzdCLGFBQVcsRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFO0FBQ2xDLGNBQVksRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFO0FBQ25DLGdCQUFjLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRTtBQUNyQyxjQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRTtBQUNuQyxVQUFRLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRTtBQUMvQixpQkFBZSxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUU7Q0FDdkMsQ0FBQzs7OztBQ1pGLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7OztBQUMxQixpQkFBZSxFQUFFLDJCQUFXO0FBQzFCLFFBQUksR0FBRyxHQUFHO0FBQ1IsVUFBSSxF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V0FBVztBQUN6RCxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUs7QUFDNUIsV0FBUyxFQUFFLENBQ1QsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQzNFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUNoRixFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FDakY7QUFDRCxPQUFLLEVBQUUsQ0FDTCxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQzNELEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFDM0QsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUM1RCxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQzVELEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FDN0Q7QUFDRCxRQUFNLEVBQUUsQ0FDTjtBQUNFLE1BQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsV0FBVztBQUM3RSxLQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLElBQUk7QUFDL0IsU0FBSyxFQUFFLEVBQUUsTUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUM1QyxhQUFTLEVBQUUsQ0FDVCxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFDaEYsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQ2pGLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUNsRjtBQUNELFNBQUssRUFBRSxDQUNMLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFDOUQsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUM5RCxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQzlELEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFDOUQsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUNuRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQ25FLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FDaEU7R0FDRixFQUNEO0FBQ0UsTUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsSUFBSTtBQUNoRSxLQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLElBQUk7QUFDL0IsU0FBSyxFQUFFLEVBQUUsTUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ25DLGFBQVMsRUFBRSxDQUNULEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUMxRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FDOUU7QUFDRCxTQUFLLEVBQUUsQ0FDTCxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQzNELEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFDM0QsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUM1RDtHQUNGLENBQ0Y7Q0FDRixDQUFBOztBQUdELGVBQWUsR0FBRztBQUNoQixJQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVztBQUN6RCxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUs7QUFDNUIsV0FBUyxFQUFFLENBQ1QsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUNySCxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQ3RIO0NBQ0YsQ0FBQTs7O0FDNURELElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7OztBQUNoQyxRQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQzs7QUFFdEMsU0FBTyxFQUFFLG1CQUFXO0FBQ2xCLFdBQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUNsQzs7QUFFRCxZQUFVLEVBQUUsc0JBQVc7QUFDckIsUUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRTtBQUNsRCxVQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFOztBQUUzRSxZQUFJLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQSxDQUFFLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUM7QUFDOUUsWUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDOztBQUU5RSxZQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUM7QUFDeEUsWUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxDQUFDOztBQUV2RCxZQUFJLEdBQUcsR0FDTDs7O1VBQ0UsOEJBQU0sQ0FBQyxFQUFFLElBQUksR0FBQyxFQUFFLEFBQUMsRUFBQyxD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TUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUM7ZUFBSSxvQkFBQyxLQUFLLElBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQUFBQyxFQUFDLEtBQUssRUFBRSxDQUFDLEFBQUMsR0FBRztPQUFBLENBQUMsQ0FBQzs7QUFFekUsVUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLEVBQUk7QUFDdkMsWUFBSSxLQUFLLEdBQUcsRUFBRSxNQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUE7QUFDdEYsZUFBTyxvQkFBQyxPQUFPLElBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEFBQUMsRUFBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQUFBQyxFQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxBQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEFBQUM7QUFDakQsZUFBSyxFQUFFLENBQUMsQUFBQyxFQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLEFBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxBQUFDLEVBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLEFBQUM7QUFDckUsZUFBSyxFQUFFLEtBQUssQUFBQyxHQUFHLENBQUM7T0FDbEMsQ0FBQyxDQUFDOztBQUVILFVBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxFQUFJO0FBQy9CLFlBQUksTUFBTSxHQUFHLE1BQUssZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFL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SUFBSSxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FDbkY7QUFDRCxXQUFLLEVBQUUsQ0FDTCxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQ25FLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFDbkUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUNwRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQzVELEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFDNUQsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUM3RCxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQzVELEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFDNUQsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUM1RCxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQzdELEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FDdkU7S0FDRjtBQUNELG9CQUFnQixFQUFFO0FBQ2hCLFVBQUksRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLFdBQVc7QUFDdEUsV0FBSyxFQUFFLEVBQUUsTUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUM1QyxlQUFTLEVBQUUsQ0FDVCxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUNoRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUNoRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsRUFBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FDbkY7QUFDRCxXQUFLLEVBQUUsQ0FDTCxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQ3RFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFDdEUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUN0RSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQ3RFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFDbkUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUNuRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQ3hFO0tBQ0Y7QUFDRCxjQUFVLEVBQUU7QUFDVixXQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFlBQVk7QUFDL0QsV0FBSyxFQUFFLEVBQUUsTUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFO0FBQzVELGVBQVMsRUFBRSxDQUNULEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQzNGLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQzVGLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUMzRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUM5RixFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxRQUFNLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFDeEYsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLEVBQUMsTUFBTSxFQUFDLHVCQUF1QixFQUFDLFVBQVUsRUFBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQ3JJO0FBQ0QsV0FBSyxFQUFFLENBQ0wsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUNuRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQ25FLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFDcEUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUMzRCxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQzNELEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFDOUQsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUNwRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQ3BFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFDNUQsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUM1RCxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQzlELEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFDdEUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUN0RTtLQUNGO0FBQ0QsdUJBQW1CLEVBQUU7QUFDbkIsVUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsU0FBUztBQUMxRSxpQkFBVyxFQUFFLENBQ1g7QUFDRSxZQUFJLEVBQUUsR0FBRztBQUNULGNB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QUNFOzs7Y0FBSSwrQkFBTyxJQUFJLEVBQUMsTUFBTSxFQUFDLEdBQUcsRUFBQyxLQUFLLEVBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEFBQUMsR0FBRzthQUFLO1lBQy9EOzs7Y0FBSSwrQkFBTyxJQUFJLEVBQUMsTUFBTSxFQUFDLEdBQUcsRUFBQyxPQUFPLEVBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEFBQUMsR0FBRTthQUFLO1dBQzdEO1NBQ0M7T0FDQTtLQUNKLENBQ047R0FDSDtDQUNGLENBQUMsQ0FBQyIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgQWN0aW9ucyA9IHtcclxuICBhZGQ6IFJlZmx1eC5jcmVhdGVBY3Rpb24oKSxcclxuICBkZWxldGU6IFJlZmx1eC5jcmVhdGVBY3Rpb24oKSxcclxuICBtb3ZlOiBSZWZsdXguY3JlYXRlQWN0aW9uKCksXHJcbiAgY29ubmVjdDogUmVmbHV4LmNyZWF0ZUFjdGlvbigpLFxyXG4gIHNlbGVjdDogUmVmbHV4LmNyZWF0ZUFjdGlvbigpLFxyXG4gIGdvSW50b0dyb3VwOiBSZWZsdXguY3JlYXRlQWN0aW9uKCksXHJcbiAgcG9ydFNlbGVjdGVkOiBSZWZsdXguY3JlYXRlQWN0aW9uKCksXHJcbiAgcG9ydERlc2VsZWN0ZWQ6IFJlZmx1eC5jcmVhdGVBY3Rpb24oKSxcclxuICBwYXJhbUNoYW5nZWQ6IFJlZmx1eC5jcmVhdGVBY3Rpb24oKSxcclxuICB2aWV3RmlsZTogUmVmbHV4LmNyZWF0ZUFjdGlvbigpLFxyXG4gIHZhcmlhYmxlQ2hhbmdlZDogUmVmbHV4LmNyZWF0ZUFjdGlvbigpXHJcbn07XHJcbiIsInZhciBBcHAgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRvYyA9IHtcbiAgICAgIG5hbWU6ICdFeHBlcmltZW50ICMxJyxcbiAgICAgIHZhcnM6IHsgc3JjbGFuZzogJ2VuJywgdHJnbGFuZzogJ2x2JywgJ2xtLW9yZGVyJzogNSwgdG9vbHNkaXI6ICcvdG9vbHMnLCB3b3JrZGlyOiAnL3Rvb2xzL3RyYWluJywgdGVtcGRpcjogJy90bXAnIH0sXG4gICAgICBzdGFjazogW11cbiAgICB9O1xuICAgIGRvYy5zdGFjay5wdXNoKG5ldyBHcm91cE1vZGVsKEFwcERlZmF1bHRHcmFwaCwgbnVsbCwgZG9jKSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG91dHB1dDogJ01ha2VmaWxlJyxcbiAgICAgIGN1cnJlbnREb2N1bWVudDogMCxcbiAgICAgIG1vZGFsOiB7XG4gICAgICAgIG9wZW46IGZhbHNlLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICB9LFxuICAgICAgZG9jdW1lbnRzOiBbXG4gICAgICAgIGRvY1xuICAgICAgXVxuICAgIH1cbiAgfSxcblxuICBtaXhpbnM6IFtSZWZsdXguTGlzdGVuZXJNaXhpbl0sXG5cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uKCkge1xuICAgICB0aGlzLmxpc3RlblRvKEFjdGlvbnMubW92ZSwgdGhpcy5vbk1vdmUpO1xuICAgICB0aGlzLmxpc3RlblRvKEFjdGlvbnMuYWRkLCB0aGlzLm9uQWRkKTtcbiAgICAgdGhpcy5saXN0ZW5UbyhBY3Rpb25zLmRlbGV0ZSwgdGhpcy5vbkRlbGV0ZSk7XG4gICAgIHRoaXMubGlzdGVuVG8oQWN0aW9ucy5zZWxlY3QsIHRoaXMub25TZWxlY3QpO1xuICAgICB0aGlzLmxpc3RlblRvKEFjdGlvbnMuZ29JbnRvR3JvdXAsIHRoaXMub25Hb0ludG9Hcm91cCk7XG4gICAgIHRoaXMubGlzdGVuVG8oQWN0aW9ucy5jb25uZWN0LCB0aGlzLm9uQ29ubmVjdCk7XG4gICAgIHRoaXMubGlzdGVuVG8oQWN0aW9ucy5wb3J0U2VsZWN0ZWQsIHAgPT4gdGhpcy5zZWxlY3RlZFBvcnQgPSBwKTtcbiAgICAgdGhpcy5saXN0ZW5UbyhBY3Rpb25zLnBvcnREZXNlbGVjdGVkLCBwID0+IHRoaXMuc2VsZWN0ZWRQb3J0ID0gbnVsbCk7XG4gICAgIHRoaXMubGlzdGVuVG8oQWN0aW9ucy5wYXJhbUNoYW5nZWQsIHRoaXMub25QYXJhbUNoYW5nZWQpO1xuICAgICB0aGlzLmxpc3RlblRvKEFjdGlvbnMudmFyaWFibGVDaGFuZ2VkLCB0aGlzLm9uVmFyaWFibGVDaGFuZ2VkKTtcbiAgICAgdGhpcy5saXN0ZW5UbyhBY3Rpb25zLnZpZXdGaWxlLCB0aGlzLm9uVmlld0ZpbGUpO1xuXG4gICAgIHRoaXMuY2xpcGJvYXJkID0gbmV3IFplcm9DbGlwYm9hcmQodGhpcy5yZWZzLmNvcHlNYWtlZmlsZUJ1dHRvbik7XG5cbiAgICAgLy9zZXRJbnRlcnZhbCgoKSA9PiB0aGlzLnVwZGF0ZVN0YXR1cygpLCAxMDAwKTtcbiAgIH0sXG5cbiAgIHVwZGF0ZVN0YXR1czogZnVuY3Rpb24oKSB7XG4gICAgIGNvbnNvbGUubG9nKCd1cGRhdGluZyBzdGF0dXMnKVxuICAgICAkLmdldCgnL3N0YXR1cycsIHJlc3VsdCA9PiB7XG4gICAgICAgdGhpcy5jdXJyZW50RG9jKCkuc3RhdHVzID0gcmVzdWx0O1xuICAgICAgIHRoaXMuc2V0U3RhdGUodGhpcy5zdGF0ZSk7XG4gICAgIH0pO1xuICAgfSxcblxuICBvblZpZXdGaWxlOiBmdW5jdGlvbihpbmZvKSB7XG4gICAgaWYgKGluZm8udHlwZSAhPSAnb3V0JykgcmV0dXJuO1xuICAgIGlmIChpbmZvLmdyb3VwLmlkID09IGluZm8ucHJvY2Vzcy5pZCkgcmV0dXJuO1xuXG4gICAgdmFyIGZpbGVuYW1lID0gaW5mby5wcm9jZXNzLm5hbWUgKyAnLWcnICsgaW5mby5ncm91cC5pZCArICdwJyArIGluZm8ucHJvY2Vzcy5pZCArICcuJyArIGluZm8ubGFiZWw7XG5cbiAgICB0aGlzLnN0YXRlLm1vZGFsLnRpdGxlID0gZmlsZW5hbWU7XG4gICAgdGhpcy5zdGF0ZS5tb2RhbC5vcGVuID0gdHJ1ZTtcbiAgICB0aGlzLnNldFN0YXRlKHsgbW9kYWw6IHRoaXMuc3RhdGUubW9kYWwgfSk7XG5cbiAgICAkLmdldCgnL2ZpbGU/bmFtZT0nICsgZmlsZW5hbWUsIHJlc3VsdCA9PiB7XG4gICAgICB0aGlzLnN0YXRlLm1vZGFsLmNvbnRlbnQgPSByZXN1bHQ7XG4gICAgICB0aGlzLnNldFN0YXRlKHsgbW9kYWw6IHRoaXMuc3RhdGUubW9kYWwgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgb25QYXJhbUNoYW5nZWQ6IGZ1bmN0aW9uKHByb2Nlc3MsIGtleSwgdmFsdWUpIHtcbiAgICBwcm9jZXNzW2tleV0gPSB2YWx1ZTtcbiAgICB0aGlzLnNldFN0YXRlKHRoaXMuc3RhdGUpO1xuICB9LFxuXG4gIG9uVmFyaWFibGVDaGFuZ2VkOiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgdGhpcy5jdXJyZW50RG9jKCkudmFyc1trZXldID0gdmFsdWU7XG4gICAgdGhpcy5zZXRTdGF0ZSh0aGlzLnN0YXRlKTtcbiAgfSxcblxuICBvbk1vdmU6IGZ1bmN0aW9uKHBvcywgZ3JhcGgsIHBhcmVudCkge1xuICAgICBncmFwaC54ID0gcG9zLng7XG4gICAgIGdyYXBoLnkgPSBwb3MueTtcbiAgICAgdGhpcy5zZXRTdGF0ZSh0aGlzLnN0YXRlKTtcbiAgfSxcblxuICBvbkFkZDogZnVuY3Rpb24odGVtcGxhdGUsIHgsIHkpIHtcbiAgICB2YXIgb2Zmc2V0ID0gUmVhY3RET00uZmluZERPTU5vZGUodGhpcy5yZWZzLmdyYXBoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBpZiAoeCA+PSBvZmZzZXQubGVmdCAmJiB4IDw9IG9mZnNldC5yaWdodCAmJiB5ID49IG9mZnNldC50b3AgJiYgeSA8PSBvZmZzZXQuYm90dG9tKSB7XG4gICAgICB2YXIgbmV4dGlkID0gdGhpcy5jdXJyZW50R3JhcGgoKS5nZXRNYXhJZCgpICsgMTtcbiAgICAgIGlmICghdGVtcGxhdGUudG9CYXNoKSB7XG4gICAgICAgIHZhciBncm91cCA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGVtcGxhdGUpKTtcbiAgICAgICAgZ3JvdXAuaWQgPSBuZXh0aWQ7XG4gICAgICAgIGdyb3VwLnggPSB4IC0gb2Zmc2V0LmxlZnQ7XG4gICAgICAgIGdyb3VwLnkgPSB5IC0gb2Zmc2V0LnRvcDtcbiAgICAgICAgZ3JvdXAuY29sbGFwc2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jdXJyZW50R3JhcGgoKS5hZGRHcm91cChncm91cCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmN1cnJlbnRHcmFwaCgpLmFkZFByb2Nlc3Moe1xuICAgICAgICAgIGlkOiBuZXh0aWQsXG4gICAgICAgICAgeDogeCAtIG9mZnNldC5sZWZ0LCB5OiB5IC0gb2Zmc2V0LnRvcCxcbiAgICAgICAgICB3aWR0aDogdGVtcGxhdGUud2lkdGggfHwgMTUwLCBoZWlnaHQ6IHRlbXBsYXRlLmhlaWdodCB8fCA1MCxcbiAgICAgICAgICB0eXBlOiB0ZW1wbGF0ZS50eXBlLCBwYXJhbXM6IHt9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgdGhpcy5zZXRTdGF0ZSh0aGlzLnN0YXRlKTtcbiAgICB9XG4gIH0sXG5cbiAgb25TZWxlY3Q6IGZ1bmN0aW9uKG9iaikge1xuICAgIG9iai5zZWxlY3RlZCA9ICFvYmouc2VsZWN0ZWQ7XG4gICAgdGhpcy5zZXRTdGF0ZSh0aGlzLnN0YXRlKTtcbiAgfSxcblxuICBvbkdvSW50b0dyb3VwOiBmdW5jdGlvbihvYmopIHtcbiAgICAvLyBwcmV2ZW50cyBkb3VibGUgY2xpY2sgYnVnc1xuICAgIGlmIChvYmogPT0gdGhpcy5jdXJyZW50RG9jKCkuc3RhY2tbMF0pIHJldHVybjtcbiAgICBpZiAob2JqID09IHRoaXMuY3VycmVudERvYygpLnN0YWNrW3RoaXMuY3VycmVudERvYygpLnN0YWNrLmxlbmd0aC0xXSkgcmV0dXJuO1xuXG4gICAgaWYgKG9iai5nZXRTaXplKSB7XG4gICAgICBvYmouY29sbGFwc2VkID0gZmFsc2U7XG4gICAgICB0aGlzLmN1cnJlbnREb2MoKS5zdGFjay5wdXNoKG9iaik7XG4gICAgICB0aGlzLnNldFN0YXRlKHRoaXMuc3RhdGUpO1xuICAgIH1cbiAgfSxcblxuICBvbkRlbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jdXJyZW50R3JhcGgoKS5kZWxldGVTZWxlY3RlZCgpO1xuICAgIHRoaXMuc2V0U3RhdGUodGhpcy5zdGF0ZSk7XG4gIH0sXG5cbiAgb25Db25uZWN0OiBmdW5jdGlvbihmcm9tKSB7XG4gICAgaWYgKGZyb20gJiYgdGhpcy5zZWxlY3RlZFBvcnQpIHtcbiAgICAgIGlmIChmcm9tLmlkID09IHRoaXMuc2VsZWN0ZWRQb3J0LmlkICYmIGZyb20ucG9ydCA9PSB0aGlzLnNlbGVjdGVkUG9ydC5wb3J0KSByZXR1cm47XG4gICAgICAvLyB2YWxpZGF0ZSBjb25uZWN0aW9uXG4gICAgICB0aGlzLmN1cnJlbnRHcmFwaCgpLmxpbmtzLnB1c2goeyBmcm9tOiBmcm9tLCB0bzogdGhpcy5zZWxlY3RlZFBvcnQgfSk7XG4gICAgICB0aGlzLnNldFN0YXRlKHRoaXMuc3RhdGUpO1xuICAgIH1cbiAgfSxcblxuICBjaGFuZ2VPdXRwdXRUeXBlOiBmdW5jdGlvbih0eXBlKSB7XG4gICAgdGhpcy5zZXRTdGF0ZSh7IG91dHB1dDogdHlwZSB9KTtcbiAgfSxcblxuICBhZGREb2M6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBkb2MgPSB7XG4gICAgICBuYW1lOiAnRXhwZXJpbWVudCAjJyArICh0aGlzLnN0YXRlLmRvY3VtZW50cy5sZW5ndGgrMSksXG4gICAgICB2YXJzOiB7IHNyY2xhbmc6ICdlbicsIHRyZ2xhbmc6ICdsdicsICdsbS1vcmRlcic6IDUsIHRvb2xzZGlyOiAnL3Rvb2xzJywgd29ya2RpcjogJy90b29scy90cmFpbicsIHRlbXBkaXI6ICcvdG1wJyB9LFxuICAgICAgc3RhY2s6IFtdXG4gICAgfTtcblxuICAgIGRvYy5zdGFjay5wdXNoKG5ldyBHcm91cE1vZGVsKHsgaWQ6IDAsIHR5cGU6ICdtYWluJywgdGl0bGU6ICdNYWluJywgeDowLCB5OjAgfSwgbnVsbCwgZG9jKSk7XG5cbiAgICB0aGlzLnN0YXRlLmRvY3VtZW50cy5wdXNoKGRvYyk7XG4gICAgdGhpcy5zdGF0ZS5jdXJyZW50RG9jdW1lbnQgPSB0aGlzLnN0YXRlLmRvY3VtZW50cy5sZW5ndGggLSAxO1xuICAgIHRoaXMuc2V0U3RhdGUodGhpcy5zdGF0ZSk7XG4gIH0sXG5cbiAgY2xvbmVEb2M6IGZ1bmN0aW9uKGRvYykge1xuICAgIHZhciBjbG9uZSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZG9jKSk7XG4gICAgY2xvbmUubmFtZSArPSAnIChjbG9uZSknO1xuICAgIGNsb25lLnN0YWNrID0gW25ldyBHcm91cFgoY2xvbmUuc3RhY2tbMF0pXVxuICAgIHRoaXMuc3RhdGUuZG9jdW1lbnRzLnB1c2goY2xvbmUpO1xuICAgIHRoaXMuc3RhdGUuY3VycmVudERvY3VtZW50ID0gdGhpcy5zdGF0ZS5kb2N1bWVudHMubGVuZ3RoIC0gMTtcbiAgICB0aGlzLnNldFN0YXRlKHRoaXMuc3RhdGUpO1xuICB9LFxuXG4gIGN1cnJlbnREb2M6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXRlLmRvY3VtZW50c1t0aGlzLnN0YXRlLmN1cnJlbnREb2N1bWVudF07XG4gIH0sXG5cbiAgZ29Ub0RvYzogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICB0aGlzLnN0YXRlLmN1cnJlbnREb2N1bWVudCA9IGluZGV4O1xuICAgIHRoaXMuc2V0U3RhdGUodGhpcy5zdGF0ZSk7XG4gIH0sXG5cbiAgY3VycmVudEdyYXBoOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50RG9jKCkuc3RhY2tbdGhpcy5jdXJyZW50RG9jKCkuc3RhY2subGVuZ3RoLTFdO1xuICB9LFxuXG4gIGdvVG86IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgd2hpbGUgKHRoaXMuY3VycmVudERvYygpLnN0YWNrLmxlbmd0aC0xICE9IGluZGV4KSB7XG4gICAgICB2YXIgZ3JhcGggPSB0aGlzLmN1cnJlbnREb2MoKS5zdGFjay5wb3AoKTtcbiAgICAgIGdyYXBoLmNvbGxhcHNlZCA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuY3VycmVudEdyYXBoKCkuY29sbGFwc2VkID0gZmFsc2U7XG4gICAgdGhpcy5zZXRTdGF0ZSh0aGlzLnN0YXRlKTtcbiAgfSxcblxuICBydW5FeHA6IGZ1bmN0aW9uKCkge1xuICAgICQuYWpheCh7IHR5cGU6ICdQT1NUJywgdXJsOiAnL3J1bicsIGRhdGE6IHRoaXMuZ2V0TWFrZWZpbGUoKSwgY29udGVudFR5cGU6ICd0ZXh0L3BsYWluJyB9LCByZXMgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVzKTtcbiAgICB9KTtcbiAgfSxcblxuICBnZXRNYWtlZmlsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGdlbk1ha2VmaWxlKHRoaXMuY3VycmVudEdyYXBoKCksIHRoaXMuY3VycmVudERvYygpLnN0YWNrWzBdKTtcbiAgfSxcblxuICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbnRhaW5lclwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT17J21vZGFsICcgKyAodGhpcy5zdGF0ZS5tb2RhbC5vcGVuID8gJ29wZW4nIDogJ2Nsb3NlZCcpfT5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1vZGFsLWhlYWRlclwiPlxuICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB0aGlzLnNldFN0YXRlKHsgbW9kYWw6IHsgb3BlbjogZmFsc2UgfSB9KX0+Q2xvc2U8L2J1dHRvbj5cbiAgICAgICAgICAgIDxoMT57dGhpcy5zdGF0ZS5tb2RhbC50aXRsZX08L2gxPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxwcmU+e3RoaXMuc3RhdGUubW9kYWwuY29udGVudH08L3ByZT5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGFibGVcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdyBoZWFkZXItcm93XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNlbGwgaGVhZGVyLWNlbGxcIj5cbiAgICAgICAgICAgICAgPGgxPkludGVyYWN0aXZlIEV4cGVyaW1lbnQgTWFuYWdlbWVudCBTeXN0ZW08L2gxPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3dcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2VsbFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRhYmxlXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3dcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2VsbFwiIHN0eWxlPXt7J2JvcmRlclJpZ2h0JzogJzFweCBzb2xpZCAjMDAwMDAwJywgJ3dpZHRoJzogJzMwMHB4JywgJ2hlaWdodCc6ICcxMDAlJ319PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNlbGwtc2Nyb2xsLW91dGVyXCIgc3R5bGU9e3snaGVpZ2h0JzogJzEwMCUnfX0+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjZWxsLXNjcm9sbC1pbm5lclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0YWJsZSBzaWRlYmFyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm93XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjZWxsIHByb3BlcnRpZXNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxQcm9wZXJ0aWVzLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm93XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjZWxsIHByb3BlcnRpZXNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxWYXJpYWJsZXMgdmFycz17dGhpcy5jdXJyZW50RG9jKCkudmFyc30vPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3dcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNlbGwgdG9vbGJveFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRvb2xib3gvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjZWxsXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGFibGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvd1wiIHN0eWxlPXt7aGVpZ2h0OiAnODAlJ319PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjZWxsXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxuYXYgY2xhc3NOYW1lPVwiZGVwdGhcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGhpcy5zdGF0ZS5kb2N1bWVudHMubWFwKChkb2MsIGluZGV4KSA9PiA8bGkgY2xhc3NOYW1lPXtpbmRleD09dGhpcy5zdGF0ZS5jdXJyZW50RG9jdW1lbnQ/J2FjdGl2ZSc6Jyd9IGtleT17aW5kZXh9IG9uQ2xpY2s9eygpID0+IHRoaXMuZ29Ub0RvYyhpbmRleCl9Pntkb2MubmFtZX08L2xpPil9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGkgY2xhc3NOYW1lPVwicmlnaHRcIiBvbkNsaWNrPXsoKSA9PiB0aGlzLmNsb25lRG9jKHRoaXMuY3VycmVudERvYygpKX0+Q2xvbmU8L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpIGNsYXNzTmFtZT1cInJpZ2h0XCIgb25DbGljaz17dGhpcy5hZGREb2N9Pk5ldzwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC9uYXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxuYXYgY2xhc3NOYW1lPVwiZGVwdGhcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGhpcy5jdXJyZW50RG9jKCkuc3RhY2subWFwKChnLCBpbmRleCkgPT4gPGxpIGtleT17aW5kZXh9IG9uQ2xpY2s9eygpID0+IHRoaXMuZ29UbyhpbmRleCl9PnsoZy50aXRsZSB8fCBnLm5hbWUgfHwgJyMnK2cuaWQpfTwvbGk+KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaSBjbGFzc05hbWU9XCJydW4gcmlnaHRcIiBvbkNsaWNrPXt0aGlzLnJ1bkV4cH0+UnVuPC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L25hdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjZWxsLXNjcm9sbC1vdXRlclwiIHN0eWxlPXt7J2hlaWdodCc6ICcxMDAlJ319PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2VsbC1zY3JvbGwtaW5uZXIgZ3JpZFwiICBzdHlsZT17eydib3JkZXJUb3AnOiAnMXB4IHNvbGlkICMwMDAnfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8R3JhcGggcmVmPVwiZ3JhcGhcIiBncmFwaD17dGhpcy5jdXJyZW50R3JhcGgoKX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxHcm91cCBncm91cD17dGhpcy5jdXJyZW50R3JhcGgoKX0gYmxhbms9e3RydWV9IG1haW49e3RydWV9Lz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvR3JhcGg+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3dcIiBzdHlsZT17eydib3JkZXJUb3AnOiAnMXB4IHNvbGlkICMwMDAnfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNlbGwgcHJldmlld1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cImNvcHlcIiByZWY9XCJjb3B5TWFrZWZpbGVCdXR0b25cIiBkYXRhLWNsaXBib2FyZC10YXJnZXQ9XCJtYWtlZmlsZVwiPkNvcHkgdG8gY2xpcGJvYXJkPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwib3B0aW9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtPYmplY3Qua2V5cyhPdXRwdXQpLm1hcChrZXkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4ga2V5PXtrZXl9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHJlYWRPbmx5IG5hbWU9XCJvdXR0eXBlXCIgY2hlY2tlZD17dGhpcy5zdGF0ZS5vdXRwdXQgPT0ga2V5ID8gJ2NoZWNrZWQnIDogJyd9IG9uQ2xpY2s9e2UgPT4gdGhpcy5jaGFuZ2VPdXRwdXRUeXBlKGtleSl9Lz4ge2tleX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHByZSBpZD1cIm1ha2VmaWxlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge091dHB1dFt0aGlzLnN0YXRlLm91dHB1dF0odGhpcy5jdXJyZW50R3JhcGgoKSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvcHJlPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxufSk7XG4iLCJ2YXIgQXBwRGVmYXVsdEdyYXBoID0ge1xyXG4gIGlkOiAwLCB0aXRsZTogJ01haW4nLCB0eXBlOiAnbWFpbicsIGNhdGVnb3J5OiAndW5kZWZpbmVkJyxcclxuICB4OiAwLCB5OiAwLCBjb2xsYXBzZWQ6IGZhbHNlLFxyXG4gIHByb2Nlc3NlczogW1xyXG4gICAgeyBpZDogMSwgeDogMjE0LCB5OiAxNzgsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAsIHR5cGU6ICdvcHVzJywgcGFyYW1zOiB7fSB9LFxyXG4gICAgeyBpZDogMiwgeDogMTUwLCB5OiAzMzQsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAsIHR5cGU6ICd0b2tlbml6ZXInLCBwYXJhbXM6IHt9IH0sXHJcbiAgICB7IGlkOiAzLCB4OiA0NTEsIHk6IDMzMywgd2lkdGg6IDE1MCwgaGVpZ2h0OiA1MCwgdHlwZTogJ3Rva2VuaXplcicsIHBhcmFtczoge30gfVxyXG4gIF0sXHJcbiAgbGlua3M6IFtcclxuICAgIHsgZnJvbTogeyBpZDogMSwgcG9ydDogJ3NyYycgfSwgdG86IHsgaWQ6IDIsIHBvcnQ6ICdpbicgfSB9LFxyXG4gICAgeyBmcm9tOiB7IGlkOiAxLCBwb3J0OiAndHJnJyB9LCB0bzogeyBpZDogMywgcG9ydDogJ2luJyB9IH0sXHJcbiAgICB7IGZyb206IHsgaWQ6IDIsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiA0LCBwb3J0OiAnc3JjJyB9IH0sXHJcbiAgICB7IGZyb206IHsgaWQ6IDMsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiA0LCBwb3J0OiAndHJnJyB9IH0sXHJcbiAgICB7IGZyb206IHsgaWQ6IDMsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiA1LCBwb3J0OiAndHJnJyB9IH1cclxuICBdLFxyXG4gIGdyb3VwczogW1xyXG4gICAge1xyXG4gICAgICBpZDogNCwgdGl0bGU6ICdXb3JkIGFsaWdubWVudCcsIHR5cGU6ICd3b3JkLWFsaWdubWVudCcsIGNhdGVnb3J5OiAnYWxpZ25tZW50JyxcclxuICAgICAgeDogMTk0LCB5OiA1NTMsIGNvbGxhcHNlZDogdHJ1ZSxcclxuICAgICAgcG9ydHM6IHsgaW46IFsnc3JjJywgJ3RyZyddLCBvdXQ6IFsnYWxnbiddIH0sXHJcbiAgICAgIHByb2Nlc3NlczogW1xyXG4gICAgICAgIHsgaWQ6IDYwMSwgeDogMjAsIHk6IDUwLCB3aWR0aDogMTUwLCBoZWlnaHQ6IDUwLCB0eXBlOiAnZmFzdGFsaWduJywgcGFyYW1zOiB7fSB9LFxyXG4gICAgICAgIHsgaWQ6IDYwMiwgeDogMjAwLCB5OiA1MCwgd2lkdGg6IDE1MCwgaGVpZ2h0OiA1MCwgdHlwZTogJ2Zhc3RhbGlnbicsIHBhcmFtczoge30gfSxcclxuICAgICAgICB7IGlkOiA2MDMsIHg6IDEyMCwgeTogMjAwLCB3aWR0aDogMTUwLCBoZWlnaHQ6IDUwLCB0eXBlOiAnc3ltYWxpZ24nLCBwYXJhbXM6IHt9IH1cclxuICAgICAgXSxcclxuICAgICAgbGlua3M6IFtcclxuICAgICAgICB7IGZyb206IHsgaWQ6IDQsIHBvcnQ6ICdzcmMnIH0sIHRvOiB7IGlkOiA2MDEsIHBvcnQ6ICdzcmMnIH0gfSxcclxuICAgICAgICB7IGZyb206IHsgaWQ6IDQsIHBvcnQ6ICd0cmcnIH0sIHRvOiB7IGlkOiA2MDIsIHBvcnQ6ICd0cmcnIH0gfSxcclxuICAgICAgICB7IGZyb206IHsgaWQ6IDQsIHBvcnQ6ICdzcmMnIH0sIHRvOiB7IGlkOiA2MDIsIHBvcnQ6ICdzcmMnIH0gfSxcclxuICAgICAgICB7IGZyb206IHsgaWQ6IDQsIHBvcnQ6ICd0cmcnIH0sIHRvOiB7IGlkOiA2MDEsIHBvcnQ6ICd0cmcnIH0gfSxcclxuICAgICAgICB7IGZyb206IHsgaWQ6IDYwMSwgcG9ydDogJ291dCcgfSwgdG86IHsgaWQ6IDYwMywgcG9ydDogJ3NyY3RyZycgfSB9LFxyXG4gICAgICAgIHsgZnJvbTogeyBpZDogNjAyLCBwb3J0OiAnb3V0JyB9LCB0bzogeyBpZDogNjAzLCBwb3J0OiAndHJnc3JjJyB9IH0sXHJcbiAgICAgICAgeyBmcm9tOiB7IGlkOiA2MDMsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiA0LCBwb3J0OiAnYWxnbicgfSB9XHJcbiAgICAgIF1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGlkOiA1LCB0aXRsZTogJ0xhbmd1YWdlIG1vZGVsJywgdHlwZTogJ2xtLWtlbmxtJywgY2F0ZWdvcnk6ICdsbScsXHJcbiAgICAgIHg6IDUzMiwgeTogNTM1LCBjb2xsYXBzZWQ6IHRydWUsXHJcbiAgICAgIHBvcnRzOiB7IGluOiBbJ3RyZyddLCBvdXQ6IFsnbG0nXSB9LFxyXG4gICAgICBwcm9jZXNzZXM6IFtcclxuICAgICAgICB7IGlkOiAyLCB4OiAyMCwgeTogNTAsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAsIHR5cGU6ICdrZW5sbScsIHBhcmFtczoge30gfSxcclxuICAgICAgICB7IGlkOiAzLCB4OiAyMCwgeTogMTc1LCB3aWR0aDogMTUwLCBoZWlnaHQ6IDUwLCB0eXBlOiAnYmluYXJwYScsIHBhcmFtczoge30gfVxyXG4gICAgICBdLFxyXG4gICAgICBsaW5rczogW1xyXG4gICAgICAgIHsgZnJvbTogeyBpZDogMiwgcG9ydDogJ291dCcgfSwgdG86IHsgaWQ6IDMsIHBvcnQ6ICdpbicgfSB9LFxyXG4gICAgICAgIHsgZnJvbTogeyBpZDogNSwgcG9ydDogJ3RyZycgfSwgdG86IHsgaWQ6IDIsIHBvcnQ6ICdpbicgfSB9LFxyXG4gICAgICAgIHsgZnJvbTogeyBpZDogMywgcG9ydDogJ291dCcgfSwgdG86IHsgaWQ6IDUsIHBvcnQ6ICdsbScgfSB9XHJcbiAgICAgIF1cclxuICAgIH1cclxuICBdXHJcbn1cclxuXHJcblxyXG5BcHBEZWZhdWx0R3JhcGggPSB7XHJcbiAgaWQ6IDAsIHRpdGxlOiAnTWFpbicsIHR5cGU6ICdtYWluJywgY2F0ZWdvcnk6ICd1bmRlZmluZWQnLFxyXG4gIHg6IDAsIHk6IDAsIGNvbGxhcHNlZDogZmFsc2UsXHJcbiAgcHJvY2Vzc2VzOiBbXHJcbiAgICB7IGlkOiAxLCB4OiAyMTQsIHk6IDE3OCwgd2lkdGg6IDE1MCwgaGVpZ2h0OiA1MCwgdHlwZTogJ29wdXMnLCBwYXJhbXM6IHsgc3JjbGFuZzogXCIkc3JjbGFuZ1wiLCB0cmdsYW5nOiBcIiR0cmdsYW5nXCIgfSB9LFxyXG4gICAgeyBpZDogNiwgeDogNDU2LCB5OiAxODMsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAsIHR5cGU6ICdvcHVzJywgcGFyYW1zOiB7IHNyY2xhbmc6IFwiJHNyY2xhbmdcIiwgdHJnbGFuZzogXCIkdHJnbGFuZ1wiIH0gfVxyXG4gIF1cclxufVxyXG4iLCJ2YXIgQ29ubmVjdG9yID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuICBtaXhpbnM6IFtSZWFjdC5hZGRvbnMuUHVyZVJlbmRlck1peGluXSxcblxuICBvbkNsaWNrOiBmdW5jdGlvbigpIHtcbiAgICBBY3Rpb25zLnNlbGVjdCh0aGlzLnByb3BzLmdyYXBoKTtcbiAgfSxcblxuICBjaGVja1R5cGVzOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wcm9wcy5zb3VyY2VUeXBlICYmIHRoaXMucHJvcHMudGFyZ2V0VHlwZSkge1xuICAgICAgaWYgKCFQcm9jZXNzTW9kZWwuaXNMaW5rVmFsaWQodGhpcy5wcm9wcy5zb3VyY2VUeXBlLCB0aGlzLnByb3BzLnRhcmdldFR5cGUpKSB7XG4gICAgICAgIC8vIHRvZG9cbiAgICAgICAgdmFyIHN0eXBlID0gKHRoaXMucHJvcHMuc291cmNlVHlwZSB8fCB7fSkudHlwZSB8fCB0aGlzLnByb3BzLnNvdXJjZVR5cGUgfHwgJyc7XG4gICAgICAgIHZhciB0dHlwZSA9ICh0aGlzLnByb3BzLnRhcmdldFR5cGUgfHwge30pLnR5cGUgfHwgdGhpcy5wcm9wcy50YXJnZXRUeXBlIHx8ICcnO1xuXG4gICAgICAgIHZhciBtaWR4ID0gKHRoaXMucHJvcHMuc291cmNlLngrdGhpcy5wcm9wcy50YXJnZXQueCkvMiAtIHN0eXBlLmxlbmd0aCozO1xuICAgICAgICB2YXIgbWlkeSA9ICh0aGlzLnByb3BzLnNvdXJjZS55K3RoaXMucHJvcHMudGFyZ2V0LnkpLzI7XG5cbiAgICAgICAgdmFyIG1zZyA9IChcbiAgICAgICAgICA8Zz5cbiAgICAgICAgICAgIDxyZWN0IHg9e21pZHgtMTB9IHk9e21pZHktMjB9IHdpZHRoPXtNYXRoLm1heChzdHlwZS5sZW5ndGgsdHR5cGUubGVuZ3RoKSo4fSBoZWlnaHQ9ezUwfT48L3JlY3Q+XG4gICAgICAgICAgICA8dGV4dCB4PXttaWR4fSB5PXttaWR5fT57c3R5cGV9PC90ZXh0PlxuICAgICAgICAgICAgPHRleHQgeD17bWlkeH0geT17bWlkeSsyMH0+e3R0eXBlfTwvdGV4dD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKE1hdGguYWJzKHRoaXMucHJvcHMuc291cmNlLnkgLSB0aGlzLnByb3BzLnRhcmdldC55KSA8IDUwKSBtc2cgPSA8Zy8+O1xuXG4gICAgICAgIHJldHVybiBtc2c7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG1zZyA9IHRoaXMuY2hlY2tUeXBlcygpO1xuXG4gICAgdmFyIGNsYXNzZXMgPSBbJ2Nvbm5lY3RvciddO1xuICAgIGlmICh0aGlzLnByb3BzLnNlbGVjdGVkKSBjbGFzc2VzLnB1c2goJ3NlbGVjdGVkJyk7XG4gICAgaWYgKG1zZykgY2xhc3Nlcy5wdXNoKCdpbmNvbXBhdGlibGUtdHlwZXMnKTtcblxuICAgIHJldHVybiAoXG4gICAgICA8ZyBjbGFzc05hbWU9e2NsYXNzZXMuam9pbignICcpfSBvbkNsaWNrPXt0aGlzLm9uQ2xpY2t9PlxuICAgICAgICA8bGluZSB4MT17dGhpcy5wcm9wcy5zb3VyY2UueH0geTE9e3RoaXMucHJvcHMuc291cmNlLnl9XG4gICAgICAgICAgICAgIHgyPXt0aGlzLnByb3BzLnRhcmdldC54fSB5Mj17dGhpcy5wcm9wcy50YXJnZXQueX0gLz5cbiAgICAgICAge21zZ31cbiAgICAgIDwvZz5cbiAgICApO1xuICB9XG59KTtcbiIsInZhciBEcmFnZ2FibGUgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gIG1peGluczogW1JlYWN0LmFkZG9ucy5QdXJlUmVuZGVyTWl4aW5dLFxuXG4gIGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICBwb3M6IHsgeDogMCwgeTogMCB9LFxuICAgICAgbWluOiBudWxsLCBtYXg6IG51bGwsXG4gICAgICBvbk1vdmU6IGZ1bmN0aW9uKCkge30sXG4gICAgICBvbkNsaWNrOiBmdW5jdGlvbigpIHt9XG4gICAgfTtcbiAgfSxcblxuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZHJhZ2dpbmc6IGZhbHNlLFxuICAgICAgbW92ZWQ6IGZhbHNlLFxuICAgICAgcG9zOiB7IHg6IHRoaXMucHJvcHMucG9zLngsIHk6IHRoaXMucHJvcHMucG9zLnkgfSxcbiAgICAgIHJlbDogbnVsbCAvLyBwb3NpdGlvbiByZWxhdGl2ZSB0byB0aGUgY3Vyc29yXG4gICAgfTtcbiAgfSxcblxuICBjb21wb25lbnREaWRVcGRhdGU6IGZ1bmN0aW9uIChwcm9wcywgc3RhdGUpIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5kcmFnZ2luZyAmJiAhc3RhdGUuZHJhZ2dpbmcpIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMub25Nb3VzZU1vdmUpO1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMub25Nb3VzZVVwKTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLnN0YXRlLmRyYWdnaW5nICYmIHN0YXRlLmRyYWdnaW5nKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLm9uTW91c2VNb3ZlKTtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLm9uTW91c2VVcCk7XG4gICAgfVxuICB9LFxuXG4gIG9uQ2xpY2s6IGZ1bmN0aW9uKGUpIHtcbiAgICAvLyBoYW5kbGVkIGJ5IG9uTW91c2VVcFxuICB9LFxuXG4gIG9uTW91c2VEb3duOiBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmJ1dHRvbiAhPT0gMCkgcmV0dXJuOyAvLyBvbmx5IGxlZnQgbW91c2UgYnV0dG9uXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBkcmFnZ2luZzogdHJ1ZSxcbiAgICAgIHJlbDoge1xuICAgICAgICB4OiBlLnBhZ2VYIC0gdGhpcy5wcm9wcy5wb3MueCxcbiAgICAgICAgeTogZS5wYWdlWSAtIHRoaXMucHJvcHMucG9zLnlcbiAgICAgIH1cbiAgICB9KTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgfSxcblxuICBvbk1vdXNlVXA6IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKCF0aGlzLnN0YXRlLm1vdmVkKSB7XG4gICAgICB0aGlzLnByb3BzLm9uQ2xpY2soZSk7XG4gICAgfVxuICAgIHRoaXMuc2V0U3RhdGUoeyBkcmFnZ2luZzogZmFsc2UsIG1vdmVkOiBmYWxzZSB9KTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgfSxcblxuICBvbk1vdXNlTW92ZTogZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoIXRoaXMuc3RhdGUuZHJhZ2dpbmcpIHJldHVybjtcbiAgICB2YXIgcG9zID0ge1xuICAgICAgeDogZS5wYWdlWCAtIHRoaXMuc3RhdGUucmVsLngsXG4gICAgICB5OiBlLnBhZ2VZIC0gdGhpcy5zdGF0ZS5yZWwueVxuICAgIH07XG4gICAgaWYgKHRoaXMucHJvcHMubWluKSB7XG4gICAgICBpZiAocG9zLnggPCB0aGlzLnByb3BzLm1pbi54KSBwb3MueCA9IHRoaXMucHJvcHMubWluLng7XG4gICAgICBpZiAocG9zLnkgPCB0aGlzLnByb3BzLm1pbi55KSBwb3MueSA9IHRoaXMucHJvcHMubWluLnk7XG4gICAgfVxuICAgIGlmICh0aGlzLnByb3BzLm1heCkge1xuICAgICAgaWYgKHBvcy54ID4gdGhpcy5wcm9wcy5tYXgueCkgcG9zLnggPSB0aGlzLnByb3BzLm1heC54O1xuICAgICAgaWYgKHBvcy55ID4gdGhpcy5wcm9wcy5tYXgueSkgcG9zLnkgPSB0aGlzLnByb3BzLm1heC55O1xuICAgIH1cbiAgICB0aGlzLnNldFN0YXRlKHsgcG9zOiBwb3MsIG1vdmVkOiB0cnVlIH0pO1xuICAgIHRoaXMucHJvcHMub25Nb3ZlKHBvcyk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIH0sXG5cbiAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxnIHsuLi50aGlzLnByb3BzfVxuICAgICAgICAgIHRyYW5zZm9ybT17YHRyYW5zbGF0ZSgke3RoaXMucHJvcHMucG9zLnh9LCR7dGhpcy5wcm9wcy5wb3MueX0pYH1cbiAgICAgICAgICBvbkNsaWNrPXt0aGlzLm9uQ2xpY2t9XG4gICAgICAgICAgb25Nb3VzZURvd249e3RoaXMub25Nb3VzZURvd259XG4gICAgICAgICAgb25Nb3ZlPXt0aGlzLnByb3BzLm9uTW92ZX0gLz5cbiAgICApO1xuICB9XG59KTtcbiIsInZhciBHcmFwaCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcbiAgbWl4aW5zOiBbUmVhY3QuYWRkb25zLlB1cmVSZW5kZXJNaXhpbl0sXG5cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVmcy5jb250YWluZXIuZm9jdXMoKTtcbiAgfSxcblxuICBvbktleURvd246IGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5rZXlDb2RlID09IDQ2KSB7XG4gICAgICBBY3Rpb25zLmRlbGV0ZSgpO1xuICAgIH1cbiAgfSxcblxuICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzaXplID0gdGhpcy5wcm9wcy5ncmFwaC5nZXRDYWxjdWxhdGVkU2l6ZSgpO1xuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IHJlZj1cImNvbnRhaW5lclwiIG9uS2V5RG93bj17dGhpcy5vbktleURvd259IHN0eWxlPXt7aGVpZ2h0OiAnMTAwJSd9fSB0YWJJbmRleD1cIjBcIj5cbiAgICAgICAgPHN2ZyBzdHlsZT17e3dpZHRoOiAoc2l6ZS53aWR0aCsyNSkrJ3B4JywgaGVpZ2h0OiAoc2l6ZS5oZWlnaHQrMTAwKSsncHgnfX0gey4uLnRoaXMucHJvcHN9Pnt0aGlzLnByb3BzLmNoaWxkcmVufTwvc3ZnPlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxufSk7XG4iLCJ2YXIgR3JvdXAgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gIC8vbWl4aW5zOiBbUmVhY3QuYWRkb25zLlB1cmVSZW5kZXJNaXhpbl0sXG5cbiAgZ2V0UG9ydFBvc2l0aW9uOiBmdW5jdGlvbihvYmosIHBvcnROYW1lLCBkaXIsIHNlbGYpIHtcbiAgICB2YXIgd2lkdGggPSBvYmoud2lkdGg7XG4gICAgdmFyIGhlaWdodCA9IG9iai5oZWlnaHQ7XG4gICAgaWYgKG9iai5nZXRTaXplKSB7XG4gICAgICB2YXIgc2l6ZSA9IG9iai5jb2xsYXBzZWQgPyB7IHdpZHRoOiAxNTAsIGhlaWdodDogNTAgfSA6IG9iai5nZXRDYWxjdWxhdGVkU2l6ZSgpO1xuICAgICAgd2lkdGggPSBzaXplLndpZHRoO1xuICAgICAgaGVpZ2h0ID0gc2l6ZS5oZWlnaHQ7XG4gICAgfVxuXG4gICAgdmFyIHggPSBzZWxmID8gMCA6IG9iai54O1xuICAgIHZhciB5ID0gc2VsZiA/IDAgOiBvYmoueTtcbiAgICBpZiAoc2VsZikgZGlyID0gZGlyID09ICdpbicgPyAnb3V0JyA6ICdpbic7XG5cbiAgICB2YXIgcG9ydHMgPSBvYmoucG9ydHM7XG4gICAgaWYgKCFwb3J0cyAmJiBvYmoudGVtcGxhdGUpIHtcbiAgICAgIHBvcnRzID0ge1xuICAgICAgICBpbjogT2JqZWN0LmtleXMob2JqLnRlbXBsYXRlLmlucHV0KSxcbiAgICAgICAgb3V0OiBPYmplY3Qua2V5cyhvYmoudGVtcGxhdGUub3V0cHV0KVxuICAgICAgfVxuICAgIH1cblxuICAgIHggKz0gKHBvcnRzW2Rpcl0uaW5kZXhPZihwb3J0TmFtZSkrMSkgKiAod2lkdGggLyAocG9ydHNbZGlyXS5sZW5ndGggKyAxKSk7XG4gICAgeSArPSBkaXIgPT0gJ291dCcgPyBoZWlnaHQgOiAwO1xuICAgIHkgKz0gKGRpciA9PSAnb3V0JyA/IDEwIDogLTEwKSAqIChzZWxmID8gLSAxIDogMSk7XG5cbiAgICByZXR1cm4geyB4OiB4LCB5OiB5IH07XG4gIH0sXG5cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZ3JvdXAgPSB0aGlzLnByb3BzLmdyb3VwO1xuXG4gICAgaWYgKHRoaXMucHJvcHMuYmxhbmspIHtcbiAgICAgIHZhciBncm91cHMgPSBncm91cC5ncm91cHMubWFwKGcgPT4gPEdyb3VwIGtleT17Zy5nZXRLZXkoKX0gZ3JvdXA9e2d9IC8+KTtcblxuICAgICAgdmFyIHByb2Nlc3NlcyA9IGdyb3VwLnByb2Nlc3Nlcy5tYXAocCA9PiB7XG4gICAgICAgIHZhciBwb3J0cyA9IHsgaW46IE9iamVjdC5rZXlzKHAudGVtcGxhdGUuaW5wdXQpLCBvdXQ6IE9iamVjdC5rZXlzKHAudGVtcGxhdGUub3V0cHV0KSB9XG4gICAgICAgIHJldHVybiA8UHJvY2VzcyB3aWR0aD17cC53aWR0aH0gaGVpZ2h0PXtwLmhlaWdodH0geD17cC54fSB5PXtwLnl9XG4gICAgICAgICAgICAgICAgICAgICAgICBncmFwaD17cH0gdGl0bGU9e3AuZ2V0VGl0bGUoKX0ga2V5PXtwLmdldEtleSgpfSBzZWxlY3RlZD17cC5zZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnRzPXtwb3J0c30gLz47XG4gICAgICB9KTtcblxuICAgICAgdmFyIGxpbmtzID0gZ3JvdXAubGlua3MubWFwKGwgPT4ge1xuICAgICAgICB2YXIgc291cmNlID0gdGhpcy5nZXRQb3J0UG9zaXRpb24oZ3JvdXAuZ2V0Q2hpbGRCeUlkKGwuZnJvbS5pZCksIGwuZnJvbS5wb3J0LCAnb3V0JywgbC5mcm9tLmlkID09IGdyb3VwLmlkKTtcbiAgICAgICAgdmFyIHRhcmdldCA9IHRoaXMuZ2V0UG9ydFBvc2l0aW9uKGdyb3VwLmdldENoaWxkQnlJZChsLnRvLmlkKSwgbC50by5wb3J0LCAnaW4nLCBsLnRvLmlkID09IGdyb3VwLmlkKTtcbiAgICAgICAgdmFyIGZyb20gPSBncm91cC5yZXNvbHZlTGlua0lucHV0KGwpO1xuICAgICAgICB2YXIgdG8gPSBncm91cC5nZXRDaGlsZEJ5SWQobC50by5pZCk7XG5cbiAgICAgICAgLy9jb25zb2xlLmxvZyhmcm9tLHRvKVxuICAgICAgICAvL2lmICghKHRvIGluc3RhbmNlb2YgR3JvdXBNb2RlbCkpIHtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKGZyb20ucHJvY2Vzcy50eXBlLCBmcm9tLnBvcnQsIGZyb20ucHJvY2Vzcy50ZW1wbGF0ZS5vdXRwdXRbZnJvbS5wb3J0XSwgdG8udHlwZSwgbC50by5wb3J0LCB0by50ZW1wbGF0ZS5pbnB1dFtsLnRvLnBvcnRdKTtcblxuICAgICAgICAgIC8vY29uc29sZS5sb2coUHJvY2Vzc01vZGVsLmlzTGlua1ZhbGlkKGZyb20ucHJvY2Vzcy50ZW1wbGF0ZS5vdXRwdXRbZnJvbS5wb3J0XSwgdG8udGVtcGxhdGUuaW5wdXRbbC50by5wb3J0XSkpXG4gICAgICAgIC8vfVxuXG4gICAgICAgIGlmICh0byBpbnN0YW5jZW9mIEdyb3VwTW9kZWwpIHtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKGZyb20ucHJvY2Vzcy50eXBlLCBmcm9tLnBvcnQsIHRvLnR5cGUsIGwudG8ucG9ydCk7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyh0by5yZXNvbHZlTGlua091dHB1dChsLnRvKSlcbiAgICAgICAgICBmcm9tID0gbnVsbDtcbiAgICAgICAgICB0byA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gPENvbm5lY3RvciBrZXk9e2dyb3VwLmdldEtleSgpKycvJytsLmZyb20uaWQrJy8nK2wuZnJvbS5wb3J0KycvJytsLnRvLmlkKycvJytsLnRvLnBvcnR9XG4gICAgICAgICAgc2VsZWN0ZWQ9e2wuc2VsZWN0ZWR9IGdyYXBoPXtsfVxuICAgICAgICAgIHNvdXJjZT17c291cmNlfSB0YXJnZXQ9e3RhcmdldH1cbiAgICAgICAgICBzb3VyY2VUeXBlPXtmcm9tID8gZnJvbS5wcm9jZXNzLnRlbXBsYXRlLm91dHB1dFtmcm9tLnBvcnRdIDogbnVsbH1cbiAgICAgICAgICB0YXJnZXRUeXBlPXt0byA/IHRvLnRlbXBsYXRlLmlucHV0W2wudG8ucG9ydF0gOiBudWxsfS8+O1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBzaXplID0gZ3JvdXAuZ2V0Q2FsY3VsYXRlZFNpemUoKTtcblxuICAgICAgcmV0dXJuIChcbiAgICAgICAgPFByb2Nlc3Mgd2lkdGg9e3NpemUud2lkdGh9IGhlaWdodD17c2l6ZS5oZWlnaHR9XG4gICAgICAgICAgICAgICAgIHg9e2dyb3VwLmlkID09IDAgPyAwIDogMjB9IHk9e2dyb3VwLmlkID09IDAgPyAwIDogNTB9XG4gICAgICAgICAgICAgICAgIGdyYXBoPXtncm91cH0gcG9ydHM9e2dyb3VwLnBvcnRzfVxuICAgICAgICAgICAgICAgICBibGFuaz17dHJ1ZX0gbWFpbj17Z3JvdXAuaWQgPT0gMH0+XG4gICAgICAgICAge2dyb3Vwc31cbiAgICAgICAgICB7cHJvY2Vzc2VzfVxuICAgICAgICAgIHtsaW5rc31cbiAgICAgICAgPC9Qcm9jZXNzPlxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHNpemUgPSB7IHdpZHRoOiAxNTAsIGhlaWdodDogNTAgfTtcbiAgICAgIHJldHVybiAoXG4gICAgICAgIDxQcm9jZXNzIHdpZHRoPXtzaXplLndpZHRofSBoZWlnaHQ9e3NpemUuaGVpZ2h0fSB4PXtncm91cC54fSB5PXtncm91cC55fVxuICAgICAgICAgICAgICAgICB0aXRsZT17Z3JvdXAuZ2V0VGl0bGUoKX0gZ3JhcGg9e2dyb3VwfSBzZWxlY3RlZD17Z3JvdXAuc2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgIHBvcnRzPXtncm91cC5wb3J0c30+XG4gICAgICAgIDwvUHJvY2Vzcz5cbiAgICAgICk7XG4gICAgfVxuICB9XG59KTtcbiIsInZhciBQb3J0ID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuICBtaXhpbnM6IFtSZWFjdC5hZGRvbnMuUHVyZVJlbmRlck1peGluXSxcblxuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcG9zOiB7IHg6IHRoaXMucHJvcHMueCwgeTogdGhpcy5wcm9wcy55IH0sXG4gICAgICBkcmFnZ2luZzogZmFsc2UsXG4gICAgICByZWw6IG51bGxcbiAgICB9O1xuICB9LFxuXG4gIGNvbXBvbmVudERpZFVwZGF0ZTogZnVuY3Rpb24gKHByb3BzLCBzdGF0ZSkge1xuICAgIGlmICh0aGlzLnN0YXRlLmRyYWdnaW5nICYmICFzdGF0ZS5kcmFnZ2luZykge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5vbk1vdXNlTW92ZSk7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5vbk1vdXNlVXApO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuc3RhdGUuZHJhZ2dpbmcgJiYgc3RhdGUuZHJhZ2dpbmcpIHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMub25Nb3VzZU1vdmUpO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMub25Nb3VzZVVwKTtcbiAgICB9XG4gIH0sXG5cbiAgb25Nb3VzZURvd246IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuYnV0dG9uICE9PSAwKSByZXR1cm47IC8vIG9ubHkgbGVmdCBtb3VzZSBidXR0b25cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGRyYWdnaW5nOiB0cnVlLFxuICAgICAgcmVsOiB7XG4gICAgICAgIHg6IGUucGFnZVggLSArdGhpcy5wcm9wcy54LFxuICAgICAgICB5OiBlLnBhZ2VZIC0gK3RoaXMucHJvcHMueVxuICAgICAgfVxuICAgIH0pO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICB9LFxuXG4gIG9uTW91c2VVcDogZnVuY3Rpb24gKGUpIHtcbiAgICB0aGlzLnNldFN0YXRlKHsgZHJhZ2dpbmc6IGZhbHNlIH0pO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIEFjdGlvbnMuY29ubmVjdCh7IGlkOiB0aGlzLnByb3BzLnByb2Nlc3MuaWQsIHBvcnQ6IHRoaXMucHJvcHMucG9ydCB9KVxuICB9LFxuXG4gIG9uTW91c2VNb3ZlOiBmdW5jdGlvbiAoZSkge1xuICAgIGlmICghdGhpcy5zdGF0ZS5kcmFnZ2luZykgcmV0dXJuO1xuICAgIHZhciBwb3MgPSB7XG4gICAgICB4OiBlLnBhZ2VYIC0gdGhpcy5zdGF0ZS5yZWwueCxcbiAgICAgIHk6IGUucGFnZVkgLSB0aGlzLnN0YXRlLnJlbC55XG4gICAgfTtcbiAgICB0aGlzLnNldFN0YXRlKHsgcG9zOiBwb3MgfSk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIH0sXG5cbiAgb25Nb3VzZU92ZXI6IGZ1bmN0aW9uKGUpIHtcbiAgICB0aGlzLnNldFN0YXRlKHsgb246IHRydWUgfSk7XG4gICAgQWN0aW9ucy5wb3J0U2VsZWN0ZWQoeyBpZDogdGhpcy5wcm9wcy5wcm9jZXNzLmlkLCBwb3J0OiB0aGlzLnByb3BzLnBvcnQgfSlcbiAgfSxcblxuICBvbk1vdXNlT3V0OiBmdW5jdGlvbihlKSB7XG4gICAgdGhpcy5zZXRTdGF0ZSh7IG9uOiBmYWxzZSB9KTtcbiAgICBBY3Rpb25zLnBvcnREZXNlbGVjdGVkKHsgaWQ6IHRoaXMucHJvcHMucHJvY2Vzcy5pZCwgcG9ydDogdGhpcy5wcm9wcy5wb3J0IH0pXG4gIH0sXG5cbiAgb25Eb3VibGVDbGljazogZnVuY3Rpb24oZSkge1xuICAgIEFjdGlvbnMudmlld0ZpbGUodGhpcy5wcm9wcyk7XG4gIH0sXG5cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGluZSA9IG51bGw7XG5cbiAgICBpZiAodGhpcy5zdGF0ZS5kcmFnZ2luZykge1xuICAgICAgbGluZSA9IDxsaW5lIHgxPXt0aGlzLnByb3BzLnh9IHkxPXt0aGlzLnByb3BzLnl9XG4gICAgICAgICAgICAgICAgICAgeDI9e3RoaXMuc3RhdGUucG9zLnh9IHkyPXt0aGlzLnN0YXRlLnBvcy55fSBjbGFzc05hbWU9XCJwb3J0LWxpbmVcIi8+O1xuICAgIH1cblxuICAgIHJldHVybiAoXG4gICAgICA8ZyBjbGFzc05hbWU9e2Bwb3J0IHBvcnQtJHt0aGlzLnByb3BzLnR5cGV9ICR7dGhpcy5zdGF0ZS5vbiA/ICdwb3J0LW9uJyA6ICcnfWB9PlxuICAgICAgICA8dGV4dCB4PXsrdGhpcy5wcm9wcy54LSh0aGlzLnByb3BzLmxhYmVsLmxlbmd0aCoyKX0geT17K3RoaXMucHJvcHMueSsodGhpcy5wcm9wcy50eXBlID09ICdpbicgPyAtMjAgOiAzMCl9Pnt0aGlzLnByb3BzLmxhYmVsfTwvdGV4dD5cbiAgICAgICAgPGNpcmNsZSBjeD17dGhpcy5wcm9wcy54fSBjeT17dGhpcy5wcm9wcy55fSByPVwiMTBcIlxuICAgICAgICAgICAgICAgIG9uTW91c2VEb3duPXt0aGlzLm9uTW91c2VEb3dufVxuICAgICAgICAgICAgICAgIG9uTW91c2VPdmVyPXt0aGlzLm9uTW91c2VPdmVyfVxuICAgICAgICAgICAgICAgIG9uTW91c2VPdXQ9e3RoaXMub25Nb3VzZU91dH1cbiAgICAgICAgICAgICAgICBvbkRvdWJsZUNsaWNrPXt0aGlzLm9uRG91YmxlQ2xpY2t9IC8+XG4gICAgICAgIHtsaW5lfVxuICAgICAgPC9nPlxuICAgICk7XG4gIH1cbn0pO1xuIiwidmFyIFByb2Nlc3MgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gIG1peGluczogW1JlYWN0LmFkZG9ucy5QdXJlUmVuZGVyTWl4aW5dLFxuXG4gIGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7IHBvcnRzOiB7IGluOiBbXSwgb3V0OiBbXSB9LCBkcmFnZ2FibGU6IHRydWUsIHg6IDAsIHk6IDAgfTtcbiAgfSxcblxuICBvbk1vdmU6IGZ1bmN0aW9uKHBvcykge1xuICAgIEFjdGlvbnMubW92ZShwb3MsIHRoaXMucHJvcHMuZ3JhcGgsIHRoaXMucHJvcHMucGFyZW50KTtcbiAgfSxcblxuICBvbkNsaWNrOiBmdW5jdGlvbihlKSB7XG4gICAgQWN0aW9ucy5zZWxlY3QodGhpcy5wcm9wcy5ncmFwaCk7XG4gIH0sXG5cbiAgZ29JbnRvR3JvdXA6IGZ1bmN0aW9uKGUpIHtcbiAgICBBY3Rpb25zLmdvSW50b0dyb3VwKHRoaXMucHJvcHMuZ3JhcGgpO1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICB9LFxuXG4gIHBvcnROYW1lOiBmdW5jdGlvbihwcm9jZXNzLCB0eXBlLCBwb3J0KSB7XG4gICAgaWYgKHByb2Nlc3MudGVtcGxhdGUpIHtcbiAgICAgIHZhciBwb3J0aW5mbyA9IHByb2Nlc3MudGVtcGxhdGVbdHlwZV1bcG9ydF07XG4gICAgICBpZiAocG9ydGluZm8udGl0bGUpIHtcbiAgICAgICAgcmV0dXJuIHBvcnRpbmZvLnRpdGxlKHByb2Nlc3MsIHJlc29sdmVQYXJhbXMocHJvY2Vzcy5wYXJhbXMsIHByb2Nlc3MuZ3JvdXAuZG9jLnZhcnMpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBvcnQ7XG4gIH0sXG5cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLnByb3BzLndpZHRoO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLnByb3BzLmhlaWdodDtcblxuICAgIHZhciBwb3J0cyA9IHRoaXMucHJvcHMucG9ydHM7XG4gICAgdmFyIG9mZnNldCA9IHtcbiAgICAgIHg6IHdpZHRoIC8gKHBvcnRzLmluLmxlbmd0aCsxKSxcbiAgICAgIHk6IHdpZHRoIC8gKHBvcnRzLm91dC5sZW5ndGgrMSlcbiAgICB9O1xuXG4gICAgdmFyIGNsYXNzZXMgPSBbJ3Byb2Nlc3MnXTtcbiAgICBpZiAodGhpcy5wcm9wcy5ibGFuaykgY2xhc3Nlcy5wdXNoKCdibGFuaycpO1xuICAgIGlmICh0aGlzLnByb3BzLm1haW4pIGNsYXNzZXMucHVzaCgnbWFpbicpO1xuICAgIGlmICh0aGlzLnByb3BzLnNlbGVjdGVkKSBjbGFzc2VzLnB1c2goJ3NlbGVjdGVkJyk7XG5cbiAgICB2YXIgcGFkZGluZyA9IDEwO1xuICAgIHZhciBtaW4gPSB7IHg6IHBhZGRpbmcsIHk6IHBhZGRpbmcgfTtcblxuICAgIHJldHVybiAoXG4gICAgICA8RHJhZ2dhYmxlIGNsYXNzTmFtZT17Y2xhc3Nlcy5qb2luKCcgJyl9XG4gICAgICAgICAgICAgICAgIHBvcz17e3g6IHRoaXMucHJvcHMueCwgeTogdGhpcy5wcm9wcy55fX0gbWluPXttaW59XG4gICAgICAgICAgICAgICAgIG9uTW92ZT17dGhpcy5vbk1vdmV9PlxuICAgICAgICA8Zz5cbiAgICAgICAgICA8cmVjdCBjbGFzc05hbWU9XCJwcm9jZXNzLXJlY3RcIiB4PVwiMFwiIHk9XCIwXCIgd2lkdGg9e3dpZHRofSBoZWlnaHQ9e2hlaWdodH0gb25Eb3VibGVDbGljaz17dGhpcy5vbkNsaWNrfS8+XG4gICAgICAgICAgPGcgY2xhc3NOYW1lPXt0aGlzLnByb3BzLmdyYXBoLmNvbGxhcHNlZD8nem9vbS1pbic6Jyd9IG9uQ2xpY2s9e3RoaXMuZ29JbnRvR3JvdXB9Pjx0ZXh0IHg9XCIxMFwiIHk9XCIzMFwiPnt0aGlzLnByb3BzLnRpdGxlfTwvdGV4dD48L2c+XG4gICAgICAgICAgPGc+e3BvcnRzLmluLm1hcCgocG9ydCwgaW5kZXgpID0+IDxQb3J0IHByb2Nlc3M9e3RoaXMucHJvcHMuZ3JhcGh9IGdyb3VwPXt0aGlzLnByb3BzLmdyb3VwfSBrZXk9e3BvcnR9IHBvcnQ9e3BvcnR9IGxhYmVsPXt0aGlzLnBvcnROYW1lKHRoaXMucHJvcHMuZ3JhcGgsICdpbnB1dCcsIHBvcnQpfSB0eXBlPVwiaW5cIiB4PXsoaW5kZXgrMSkqb2Zmc2V0Lnh9IHk9ezB9Lz4pfTwvZz5cbiAgICAgICAgICA8Zz57cG9ydHMub3V0Lm1hcCgocG9ydCwgaW5kZXgpID0+IDxQb3J0IHByb2Nlc3M9e3RoaXMucHJvcHMuZ3JhcGh9IGdyb3VwPXt0aGlzLnByb3BzLmdyb3VwfSBrZXk9e3BvcnR9IHBvcnQ9e3BvcnR9IGxhYmVsPXt0aGlzLnBvcnROYW1lKHRoaXMucHJvcHMuZ3JhcGgsICdvdXRwdXQnLCBwb3J0KX0gdHlwZT1cIm91dFwiIHg9eyhpbmRleCsxKSpvZmZzZXQueX0geT17aGVpZ2h0fS8+KX08L2c+XG4gICAgICAgIDwvZz5cbiAgICAgICAgPGc+XG4gICAgICAgICAge3RoaXMucHJvcHMuY2hpbGRyZW59XG4gICAgICAgIDwvZz5cbiAgICAgIDwvRHJhZ2dhYmxlPlxuICAgICk7XG4gIH1cbn0pO1xuIiwiY2xhc3MgR3JvdXBNb2RlbCB7XG4gIGNvbnN0cnVjdG9yKG9iaiwgcGFyZW50LCBkb2MpIHtcbiAgICB0aGlzLmdyb3VwcyA9IFtdO1xuICAgIHRoaXMucHJvY2Vzc2VzID0gW107XG4gICAgdGhpcy5saW5rcyA9IFtdO1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuZG9jID0gZG9jO1xuXG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgdGhpc1trZXldID0gb2JqW2tleV07XG4gICAgfVxuXG4gICAgdGhpcy5ncm91cHMuZm9yRWFjaCgoZywgaW5kZXgpID0+IHRoaXMuZ3JvdXBzW2luZGV4XSA9IG5ldyBHcm91cE1vZGVsKGcsIHRoaXMsIGRvYykpO1xuICAgIHRoaXMucHJvY2Vzc2VzLmZvckVhY2goKHAsIGluZGV4KSA9PiB0aGlzLnByb2Nlc3Nlc1tpbmRleF0gPSBuZXcgUHJvY2Vzc01vZGVsKHAsIHRoaXMpKTtcbiAgfVxuXG4gIGdldEtleSgpIHtcbiAgICByZXR1cm4gKHRoaXMucGFyZW50ID8gdGhpcy5wYXJlbnQuZ2V0S2V5KCkgOiAnJykgKyB0aGlzLnR5cGUgKyB0aGlzLmlkO1xuICB9XG5cbiAgZ2V0VGl0bGUoKSB7XG4gICAgaWYgKHRoaXMudG9UaXRsZSkgcmV0dXJuIHRoaXMudG9UaXRsZSh0aGlzKTtcbiAgICBpZiAodGhpcy50aXRsZSkgcmV0dXJuIHRoaXMudGl0bGU7XG4gICAgcmV0dXJuIHRoaXMudHlwZTtcbiAgfVxuXG4gIGdldE1heElkKCkge1xuICAgIHZhciBnbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdGhpcy5ncm91cHMubWFwKGcgPT4gZy5pZCkpO1xuICAgIHZhciBwbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdGhpcy5wcm9jZXNzZXMubWFwKHAgPT4gcC5pZCkpO1xuICAgIHJldHVybiBNYXRoLm1heC5hcHBseShudWxsLCBbdGhpcy5pZCwgZ21heCwgcG1heF0pO1xuICB9XG5cbiAgYWRkR3JvdXAoZ3JvdXApIHtcbiAgICBncm91cC5saW5rcy5mb3JFYWNoKGwgPT4ge1xuICAgICAgaWYgKCFsLmZyb20uaWQpIGwuZnJvbS5pZCA9IGdyb3VwLmlkO1xuICAgICAgaWYgKCFsLnRvLmlkKSBsLnRvLmlkID0gZ3JvdXAuaWQ7XG4gICAgfSk7XG5cbiAgICB0aGlzLmdyb3Vwcy5wdXNoKG5ldyBHcm91cE1vZGVsKGdyb3VwLCB0aGlzLCB0aGlzLmRvYykpO1xuICB9XG5cbiAgYWRkUHJvY2Vzcyhwcm9jZXNzKSB7XG4gICAgdGhpcy5wcm9jZXNzZXMucHVzaChuZXcgUHJvY2Vzc01vZGVsKHByb2Nlc3MsIHRoaXMpKTtcbiAgfVxuXG4gIGRlbGV0ZVNlbGVjdGVkKCkge1xuICAgIC8vIHJlbW92ZSBzZWxlY3RlZCBpdGVtc1xuICAgIHRoaXMuZ3JvdXBzLmZpbHRlcihnID0+IGcuc2VsZWN0ZWQpLnNsaWNlKCkuZm9yRWFjaChnID0+IHRoaXMuZGVsZXRlR3JvdXAoZykpO1xuICAgIHRoaXMucHJvY2Vzc2VzLmZpbHRlcihwID0+IHAuc2VsZWN0ZWQpLnNsaWNlKCkuZm9yRWFjaChwID0+IHRoaXMuZGVsZXRlUHJvY2VzcyhwKSk7XG4gICAgdGhpcy5saW5rcy5maWx0ZXIobCA9PiBsLnNlbGVjdGVkKS5zbGljZSgpLmZvckVhY2gobCA9PiB0aGlzLmRlbGV0ZUxpbmsobCkpO1xuICAgIC8vIGlmIGFueXRoaW5nIGlzIHNlbGVjdGVkIGluIHN1Ymdyb3VwcywgZGVsZXRlIGl0IGFzIHdlbGxcbiAgICB0aGlzLmdyb3Vwcy5mb3JFYWNoKGcgPT4gZy5kZWxldGVTZWxlY3RlZCgpKTtcbiAgfVxuXG4gIGRlbGV0ZUdyb3VwKGdyb3VwKSB7XG4gICAgdGhpcy5ncm91cHMuc3BsaWNlKHRoaXMuZ3JvdXBzLmluZGV4T2YoZ3JvdXApLCAxKTtcbiAgICB0aGlzLmxpbmtzLnNsaWNlKCkuZm9yRWFjaChsID0+IHtcbiAgICAgIGlmIChsLmZyb20uaWQgPT0gZ3JvdXAuaWQgfHwgbC50by5pZCA9PSBncm91cC5pZCkge1xuICAgICAgICB0aGlzLmRlbGV0ZUxpbmsobCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBkZWxldGVQcm9jZXNzKHByb2Nlc3MpIHtcbiAgICB0aGlzLnByb2Nlc3Nlcy5zcGxpY2UodGhpcy5wcm9jZXNzZXMuaW5kZXhPZihwcm9jZXNzKSwgMSk7XG4gICAgdGhpcy5saW5rcy5zbGljZSgpLmZvckVhY2gobCA9PiB7XG4gICAgICBpZiAobC5mcm9tLmlkID09IHByb2Nlc3MuaWQgfHwgbC50by5pZCA9PSBwcm9jZXNzLmlkKSB7XG4gICAgICAgIHRoaXMuZGVsZXRlTGluayhsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGRlbGV0ZUxpbmsobGluaykge1xuICAgIHRoaXMubGlua3Muc3BsaWNlKHRoaXMubGlua3MuaW5kZXhPZihsaW5rKSwgMSk7XG4gIH1cblxuICBnZXRTaXplKCkge1xuICAgIGlmICh0aGlzLmNvbGxhcHNlZCkge1xuICAgICAgcmV0dXJuIHsgd2lkdGg6IDE1MCwgaGVpZ2h0OiA1MCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDYWxjdWxhdGVkU2l6ZSgpO1xuICAgIH1cbiAgfVxuXG4gIGdldENhbGN1bGF0ZWRTaXplKCkge1xuICAgIHZhciBzaXplID0geyB3aWR0aDogdGhpcy54LCBoZWlnaHQ6IHRoaXMueSB9O1xuICAgIHZhciBwYWRkaW5nID0gNTA7XG4gICAgdGhpcy5ncm91cHMuZm9yRWFjaChnID0+IHtcbiAgICAgIHZhciBncm91cFNpemUgPSBnLmNvbGxhcHNlZCA/IGcuZ2V0U2l6ZSgpIDogZy5nZXRDYWxjdWxhdGVkU2l6ZSgpO1xuICAgICAgaWYgKGcueCArIGdyb3VwU2l6ZS53aWR0aCArIHBhZGRpbmcgPiBzaXplLndpZHRoKSBzaXplLndpZHRoID0gZy54ICsgZ3JvdXBTaXplLndpZHRoICsgcGFkZGluZztcbiAgICAgIGlmIChnLnkgKyBncm91cFNpemUuaGVpZ2h0ICsgcGFkZGluZyA+IHNpemUuaGVpZ2h0KSBzaXplLmhlaWdodCA9IGcueSArIGdyb3VwU2l6ZS5oZWlnaHQgKyBwYWRkaW5nO1xuICAgIH0pO1xuICAgIHRoaXMucHJvY2Vzc2VzLmZvckVhY2gocCA9PiB7XG4gICAgICBpZiAocC54ICsgcC53aWR0aCArIHBhZGRpbmcgPiBzaXplLndpZHRoKSBzaXplLndpZHRoID0gcC54ICsgcC53aWR0aCArIHBhZGRpbmc7XG4gICAgICBpZiAocC55ICsgcC5oZWlnaHQgKyBwYWRkaW5nID4gc2l6ZS5oZWlnaHQpIHNpemUuaGVpZ2h0ID0gcC55ICsgcC5oZWlnaHQgKyBwYWRkaW5nO1xuICAgIH0pO1xuICAgIHJldHVybiBzaXplO1xuICB9XG5cbiAgZ2V0Q2hpbGRCeUlkKGlkKSB7XG4gICAgaWYgKHRoaXMuaWQgPT0gaWQpIHJldHVybiB0aGlzO1xuICAgIHJldHVybiB0aGlzLnByb2Nlc3Nlcy5maWx0ZXIocCA9PiBwLmlkID09IGlkKVswXSB8fCB0aGlzLmdyb3Vwcy5maWx0ZXIoZyA9PiBnLmlkID09IGlkKVswXTtcbiAgfVxuXG4gIHJlc29sdmVMaW5rSW5wdXQobGluaykge1xuICAgIGlmIChsaW5rLmZyb20pIHtcbiAgICAgIGlmIChsaW5rLmZyb20uaWQgPT0gdGhpcy5pZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZUxpbmtJbnB1dCh7IHRvOiBsaW5rLmZyb20gfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgY2hpbGQgPSB0aGlzLnByb2Nlc3Nlcy5maWx0ZXIocCA9PiBwLmlkID09IGxpbmsuZnJvbS5pZClbMF07XG4gICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgIHJldHVybiB7IHByb2Nlc3M6IGNoaWxkLCBwb3J0OiBsaW5rLmZyb20ucG9ydCB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBsaW5rVG8gPSB0aGlzLmxpbmtzLmZpbHRlcihsID0+IGwudG8uaWQgPT0gbGluay50by5pZCAmJiBsLnRvLnBvcnQgPT0gbGluay50by5wb3J0KVswXTtcbiAgICAgIGlmIChsaW5rVG8pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUxpbmtJbnB1dChsaW5rVG8pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICByZXNvbHZlTGlua091dHB1dChmcm9tKSB7XG4gICAgdmFyIGxpbmtzID0gdGhpcy5saW5rc1xuICAgICAgLmZpbHRlcihsID0+IGwuZnJvbS5pZCA9PSBmcm9tLmlkICYmIGwuZnJvbS5wb3J0ID09IGZyb20ucG9ydClcbiAgICAgIC5tYXAobCA9PiB0aGlzLmdldENoaWxkQnlJZChsLnRvLmlkKSk7XG5cbiAgICByZXR1cm4gW10uY29uY2F0LmFwcGx5KFtdLCBsaW5rcyk7XG4gIH1cbn1cbiIsImZ1bmN0aW9uIHJlc29sdmVQYXJhbXMocGFyYW1zLCB2YXJzKSB7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgZm9yICh2YXIga2V5IGluIHBhcmFtcykge1xuICAgIGlmIChwYXJhbXNba2V5XVswXSA9PSAnJCcpIHtcbiAgICAgIGlmIChwYXJhbXNba2V5XS5zdWJzdHIoMSkgaW4gdmFycykge1xuICAgICAgICByZXN1bHRba2V5XSA9IHZhcnNbcGFyYW1zW2tleV0uc3Vic3RyKDEpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRba2V5XSA9IHBhcmFtc1trZXldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBoYXNoRm52MzJhKHN0ciwgYXNTdHJpbmcsIHNlZWQpIHtcbiAgICAvKmpzaGludCBiaXR3aXNlOmZhbHNlICovXG4gICAgdmFyIGksIGwsXG4gICAgICAgIGh2YWwgPSAoc2VlZCA9PT0gdW5kZWZpbmVkKSA/IDB4ODExYzlkYzUgOiBzZWVkO1xuXG4gICAgZm9yIChpID0gMCwgbCA9IHN0ci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaHZhbCBePSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICAgICAgaHZhbCArPSAoaHZhbCA8PCAxKSArIChodmFsIDw8IDQpICsgKGh2YWwgPDwgNykgKyAoaHZhbCA8PCA4KSArIChodmFsIDw8IDI0KTtcbiAgICB9XG4gICAgaWYoIGFzU3RyaW5nICl7XG4gICAgICAgIC8vIENvbnZlcnQgdG8gOCBkaWdpdCBoZXggc3RyaW5nXG4gICAgICAgIHJldHVybiAoXCIwMDAwMDAwXCIgKyAoaHZhbCA+Pj4gMCkudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTgpO1xuICAgIH1cbiAgICByZXR1cm4gaHZhbCA+Pj4gMDtcbn1cblxudmFyIE91dHB1dCA9IHtcbiAgTm90aGluZzogKCkgPT4gJycsXG5cbiAgSlNPTjogKGdyYXBoLCBkZXB0aCkgPT4ge1xuICAgIGZ1bmN0aW9uIHBhcmFtczJzdHIocGFyYW1zKSB7XG4gICAgICB2YXIgYXJyID0gW107XG4gICAgICBmb3IgKHZhciBrZXkgaW4gcGFyYW1zKSB7XG4gICAgICAgIGFyci5wdXNoKGtleSArICc6IFwiJyArIHBhcmFtc1trZXldLnJlcGxhY2UoJ1wiJywgJ1xcXFxcIicpICsgJ1wiJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJyLmpvaW4oJywgJyk7XG4gICAgfVxuXG4gICAgaWYgKCFkZXB0aCkgZGVwdGggPSAwO1xuICAgIHZhciBwYWQgPSAnJzsgZm9yICh2YXIgaSA9IDA7IGkgPCBkZXB0aCArICgxKmRlcHRoKSArIDE7IGkrKykgcGFkICs9ICcgICc7XG4gICAgdmFyIHBhZDEgPSAnJzsgZm9yICh2YXIgaSA9IDA7IGkgPCBkZXB0aCArICgxKmRlcHRoKTsgaSsrKSBwYWQxICs9ICcgICc7XG4gICAgdmFyIHBhZDIgPSAnJzsgZm9yICh2YXIgaSA9IDA7IGkgPCBkZXB0aCArICgxKmRlcHRoKSArIDI7IGkrKykgcGFkMiArPSAnICAnO1xuXG4gICAgLy8gZ3JvdXAgZGF0YVxuICAgIHZhciBqc29uID0gcGFkMSArICd7JyArICdcXG4nO1xuICAgIGpzb24gKz0gcGFkICsgYGlkOiAke2dyYXBoLmlkfSwgdGl0bGU6ICcke2dyYXBoLnRpdGxlLnJlcGxhY2UoXCInXCIsIFwiXFxcXCdcIil9JywgYFxuICAgICAgICAgICAgICAgICsgYHR5cGU6ICcke2dyYXBoLnR5cGV9JywgY2F0ZWdvcnk6ICcke2dyYXBoLmNhdGVnb3J5fScsYCArICdcXG4nO1xuICAgIGpzb24gKz0gcGFkICsgYHg6ICR7Z3JhcGgueH0sIHk6ICR7Z3JhcGgueX0sIGNvbGxhcHNlZDogJHtncmFwaC5jb2xsYXBzZWQgPyB0cnVlIDogZmFsc2V9LGAgKyAnXFxuJztcbiAgICBpZiAoZ3JhcGgucG9ydHMpIGpzb24gKz0gcGFkICsgYHBvcnRzOiB7IGluOiBbJyR7Z3JhcGgucG9ydHMuaW4uam9pbihcIicsICdcIil9J10sIG91dDogWycke2dyYXBoLnBvcnRzLm91dC5qb2luKFwiJywgJ1wiKX0nXSB9LGAgKyAnXFxuJztcblxuICAgIC8vIHByb2Nlc3NlcyBkYXRhXG4gICAganNvbiArPSBwYWQgKyAncHJvY2Vzc2VzOiBbJyArICdcXG4nO1xuICAgIGpzb24gKz0gZ3JhcGgucHJvY2Vzc2VzXG4gICAgICAubWFwKHAgPT4gYHsgaWQ6ICR7cC5pZH0sIHg6ICR7cC54fSwgeTogJHtwLnl9LCB3aWR0aDogJHtwLndpZHRofSwgaGVpZ2h0OiAke3AuaGVpZ2h0fSwgdHlwZTogJyR7cC50eXBlfScsIHBhcmFtczogeyAke3BhcmFtczJzdHIocC5wYXJhbXMpfSB9IH1gKVxuICAgICAgLm1hcChzID0+IHBhZDIgKyBzKS5qb2luKCcsXFxuJykgKyAnXFxuJztcbiAgICBqc29uICs9IHBhZCArICddJztcblxuICAgIC8vIGxpbmtzIGRhdGFcbiAgICBpZiAoZ3JhcGgubGlua3MubGVuZ3RoKSB7XG4gICAgICBqc29uICs9ICcsJyArICdcXG4nO1xuICAgICAganNvbiArPSBwYWQgKyAnbGlua3M6IFsnICsgJ1xcbic7XG4gICAgICBqc29uICs9IGdyYXBoLmxpbmtzXG4gICAgICAgIC5tYXAobCA9PiBgeyBmcm9tOiB7IGlkOiAke2wuZnJvbS5pZH0sIHBvcnQ6ICcke2wuZnJvbS5wb3J0fScgfSwgdG86IHsgaWQ6ICR7bC50by5pZH0sIHBvcnQ6ICcke2wudG8ucG9ydH0nIH0gfWApXG4gICAgICAgIC5tYXAocyA9PiBwYWQyICsgcykuam9pbignLFxcbicpICsgJ1xcbic7XG4gICAgICBqc29uICs9IHBhZCArICddJztcbiAgICB9XG5cbiAgICBpZiAoZ3JhcGguZ3JvdXBzLmxlbmd0aCkge1xuICAgICAganNvbiArPSAnLCcgKyAnXFxuJztcbiAgICAgIGpzb24gKz0gcGFkICsgJ2dyb3VwczogWycgKyAnXFxuJztcbiAgICAgIGpzb24gKz0gZ3JhcGguZ3JvdXBzLm1hcChnID0+IE91dHB1dC5KU09OKGcsIGRlcHRoICsgMSkpLmpvaW4oJyxcXG4nKSArICdcXG4nO1xuICAgICAganNvbiArPSBwYWQgKyAnXSc7XG4gICAgfVxuXG4gICAganNvbiArPSAnXFxuJztcbiAgICBqc29uICs9IHBhZDEgKyAnfSc7XG5cbiAgICBpZiAoZGVwdGggPT0gMCkganNvbiArPSAnXFxuJztcblxuICAgIHJldHVybiBqc29uO1xuICB9LFxuXG4gIE1ha2VmaWxlOiAoZ3JhcGgsIGFsbCwgY2FjaGUpID0+IHtcbiAgICBmdW5jdGlvbiBwcm9jZXNzTmFtZShwLCBwb3J0KSB7XG4gICAgICB2YXIgaGFzaCA9IGhhc2hGbnYzMmEocC5nZXRIYXNoS2V5KCksIHRydWUpO1xuICAgICAgcmV0dXJuIHAudHlwZSArICctJyArIGhhc2ggKyAocG9ydCA/ICcuJyArIHBvcnQgOiAnJyk7XG4gICAgfVxuXG4gICAgdmFyIHRleHQgPSAnJztcblxuICAgIHZhciByb290ID0gIWFsbDtcbiAgICBpZiAocm9vdCkgYWxsID0gW107XG5cbiAgICBncmFwaC5wcm9jZXNzZXMuZm9yRWFjaChwID0+IHtcbiAgICAgIHZhciBpbnB1dCA9IHt9O1xuICAgICAgdmFyIG91dHB1dCA9IHt9O1xuICAgICAgdmFyIG5vT3V0cHV0ID0gbnVsbDtcblxuICAgICAgT2JqZWN0LmtleXMocC50ZW1wbGF0ZS5vdXRwdXQpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgb3V0cHV0W2tleV0gPSBwcm9jZXNzTmFtZShwLCBrZXkpO1xuICAgICAgICBhbGwucHVzaChvdXRwdXRba2V5XSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKE9iamVjdC5rZXlzKG91dHB1dCkubGVuZ3RoID09IDApIHtcbiAgICAgICAgbm9PdXRwdXQgPSBwcm9jZXNzTmFtZShwLCAnZG9uZScpO1xuICAgICAgICBhbGwucHVzaChub091dHB1dCk7XG4gICAgICB9XG5cbiAgICAgIGdyYXBoLmxpbmtzLmZpbHRlcihsID0+IGwudG8uaWQgPT0gcC5pZCkuZm9yRWFjaChsID0+IHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGdyYXBoLnJlc29sdmVMaW5rSW5wdXQobCk7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICBpbnB1dFtsLnRvLnBvcnRdID0gcHJvY2Vzc05hbWUocmVzdWx0LnByb2Nlc3MsIHJlc3VsdC5wb3J0KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRleHQgKz0gbm9PdXRwdXQgfHwgT2JqZWN0LmtleXMob3V0cHV0KS5tYXAoa2V5ID0+IG91dHB1dFtrZXldKS5qb2luKCcgJyk7XG4gICAgICB0ZXh0ICs9ICc6ICdcbiAgICAgIHRleHQgKz0gT2JqZWN0LmtleXMoaW5wdXQpLm1hcChrZXkgPT4gaW5wdXRba2V5XSkuam9pbignICcpXG4gICAgICB0ZXh0ICs9ICdcXG4nXG4gICAgICB0ZXh0ICs9ICdcXHQnICsgYHRvdWNoIHN0YXR1cy4ke3Byb2Nlc3NOYW1lKHAsICdydW5uaW5nJyl9YCArICdcXG4nO1xuICAgICAgdGV4dCArPSAnXFx0JyArIHAudGVtcGxhdGUudG9CYXNoKHJlc29sdmVQYXJhbXMocC5wYXJhbXMsIHAuZ3JvdXAuZG9jLnZhcnMpLCBpbnB1dCwgb3V0cHV0KS5qb2luKCdcXG5cXHQnKSArICdcXG4nO1xuICAgICAgaWYgKG5vT3V0cHV0KSB0ZXh0ICs9ICdcXHR0b3VjaCAnICsgbm9PdXRwdXQgKyAnXFxuJztcbiAgICAgIHRleHQgKz0gJ1xcdCcgKyBgbXYgc3RhdHVzLiR7cHJvY2Vzc05hbWUocCwgJ3J1bm5pbmcnKX0gc3RhdHVzLiR7cHJvY2Vzc05hbWUocCwgJ2RvbmUnKX1gICsgJ1xcbic7XG4gICAgICB0ZXh0ICs9ICdcXG4nXG4gICAgfSk7XG5cbiAgICBncmFwaC5ncm91cHMuZm9yRWFjaChnID0+IHRleHQgKz0gT3V0cHV0Lk1ha2VmaWxlKGcsIGFsbCwgY2FjaGUpICsgJ1xcbicpO1xuXG4gICAgaWYgKHJvb3QpIHtcbiAgICAgIHRleHQgPVxuICAgICAgICAnLlBIT05ZOiBhbGwgY2xlYW5cXG5cXG4nICtcbiAgICAgICAgJ2FsbDogJyArIGFsbC5qb2luKCcgJykgKyAnXFxuXFxuJyArXG4gICAgICAgICdjbGVhbjpcXG5cXHRybSAtcmYgc3RhdHVzLiogJyArIGFsbC5qb2luKCcgJykgKyAnXFxuXFxuJyArXG4gICAgICAgIHRleHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRleHQ7XG4gIH1cbn07XG4iLCJjbGFzcyBQcm9jZXNzTW9kZWwge1xyXG4gIGNvbnN0cnVjdG9yKG9iaiwgZ3JvdXApIHtcclxuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcclxuICAgICAgdGhpc1trZXldID0gb2JqW2tleV07XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5ncm91cCAgPSBncm91cDtcclxuICAgIHRoaXMucGFyYW1zID0gdGhpcy5wYXJhbXMgfHwge307XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gVG9vbHMucHJvY2Vzc2VzW3RoaXMudHlwZV07XHJcblxyXG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMudGVtcGxhdGUucGFyYW1zKSB7XHJcbiAgICAgIGlmICghdGhpcy5wYXJhbXNba2V5XSAmJiB0aGlzLnRlbXBsYXRlLnBhcmFtc1trZXldLmRlZmF1bHQpIHtcclxuICAgICAgICB0aGlzLnBhcmFtc1trZXldID0gdGhpcy50ZW1wbGF0ZS5wYXJhbXNba2V5XS5kZWZhdWx0O1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXRUaXRsZSgpIHtcclxuICAgIGlmICh0aGlzLnRpdGxlKSByZXR1cm4gdGhpcy50aXRsZTtcclxuICAgIGlmICh0aGlzLnRlbXBsYXRlLnRvVGl0bGUpIHJldHVybiB0aGlzLnRlbXBsYXRlLnRvVGl0bGUodGhpcywgcmVzb2x2ZVBhcmFtcyh0aGlzLnBhcmFtcywgdGhpcy5ncm91cC5kb2MudmFycykpO1xyXG4gICAgaWYgKHRoaXMudGVtcGxhdGUudGl0bGUpIHJldHVybiB0aGlzLnRlbXBsYXRlLnRpdGxlO1xyXG4gICAgcmV0dXJuIHRoaXMudHlwZTtcclxuICB9XHJcblxyXG4gIGdldElucHV0KCkge1xyXG4gICAgdmFyIGxpbmsgPSB0aGlzLmdyb3VwLmxpbmtzLmZpbHRlcihsID0+IGwudG8uaWQgPT0gdGhpcy5pZClbMF07XHJcbiAgICBpZiAobGluayAmJiBsaW5rLnByb2Nlc3MpIHJldHVybiB0aGlzLmdyb3VwLnJlc29sdmVMaW5rSW5wdXQobGluaykucHJvY2VzcztcclxuICB9XHJcblxyXG4gIGdldEtleSgpIHtcclxuICAgIHJldHVybiB0aGlzLnR5cGUgKyAnLWcnICsgdGhpcy5ncm91cC5pZCArICdwJyArIHRoaXMuaWQ7XHJcbiAgfVxyXG4gIGdldEhhc2hLZXkoKSB7XHJcbiAgICB2YXIga2V5ID0gW107XHJcbiAgICBrZXkucHVzaCgndGVtcGxhdGU9JyAgKyB0aGlzLnR5cGUpO1xyXG4gICAga2V5LnB1c2goJ3RlbXBsYXRlVmVyPScgKyB0aGlzLnRlbXBsYXRlLnZlcnNpb24pO1xyXG4gICAgdmFyIHBhcmFtcyA9IHJlc29sdmVQYXJhbXModGhpcy5wYXJhbXMsIHRoaXMuZ3JvdXAuZG9jLnZhcnMpO1xyXG4gICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLnRlbXBsYXRlLnBhcmFtcykge1xyXG4gICAgICBpZiAodGhpcy50ZW1wbGF0ZS5wYXJhbXNbbmFtZV0ubm9oYXNoKVxyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICBpZiAobmFtZSBpbiBwYXJhbXMpIHtcclxuICAgICAgICBrZXkucHVzaChgcGFyYW06JHtuYW1lfT0ke3BhcmFtc1tuYW1lXX1gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgdmFyIHByZXYgPSB0aGlzLmdldElucHV0KCk7XHJcbiAgICByZXR1cm4gKHByZXYgPyBwcmV2LmdldEhhc2hLZXkoKSA6ICc8cm9vdD4nKSArICcgLT4gJyArIGtleS5qb2luKCc7Jyk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgaXNMaW5rVmFsaWQoYSwgYikge1xyXG4gICAgdmFyIGF0eXBlID0gYS50eXBlIHx8IGE7XHJcbiAgICB2YXIgYnR5cGUgPSBiLnR5cGUgfHwgYjtcclxuICAgIC8vY29uc29sZS5sb2coYXR5cGUsIGJ0eXBlKVxyXG4gICAgcmV0dXJuIGF0eXBlID09IGJ0eXBlO1xyXG4gIH1cclxufVxyXG4iLCJ2YXIgVG9vbHMgPSB7XG4gIHByb2Nlc3Nlczoge1xuICAgIHdnZXQ6IHtcbiAgICAgIHR5cGU6ICd3Z2V0JywgY2F0ZWdvcnk6ICdjb3Jwb3JhJyxcbiAgICAgIHBhcmFtczogeyB1cmw6ICdzdHJpbmcnIH0sXG4gICAgICBpbnB1dDogeyB9LFxuICAgICAgb3V0cHV0OiB7IG91dDogJ2ZpbGU8YW55PicgfSxcbiAgICAgIHRvQmFzaDogKHBhcmFtcywgaW5wdXQsIG91dHB1dCkgPT4ge1xuICAgICAgICByZXR1cm4gW2B3Z2V0ICR7cGFyYW1zLnVybH0gLU8gJHtvdXRwdXQub3V0fWBdO1xuICAgICAgfVxuICAgIH0sXG4gICAgb3B1czoge1xuICAgICAgdHlwZTogJ29wdXMnLCB0aXRsZTogJ09QVVMnLCBjYXRlZ29yeTogJ2NvcnBvcmEnLFxuICAgICAgcGFyYW1zOiB7XG4gICAgICAgIGNvcnB1czogJ3N0cmluZycsXG4gICAgICAgIHNyY2xhbmc6IHsgdHlwZTogJ2xhbmd1YWdlJywgZGVmYXVsdDogJyRzcmNsYW5nJyB9LFxuICAgICAgICB0cmdsYW5nOiB7IHR5cGU6ICdsYW5ndWFnZScsIGRlZmF1bHQ6ICckdHJnbGFuZycgfVxuICAgICAgfSxcbiAgICAgIGlucHV0OiB7IH0sXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgc3JjOiB7XG4gICAgICAgICAgdHlwZTogJ2ZpbGU8dGV4dD4nLFxuICAgICAgICAgIHRpdGxlOiAocCwgcGFyYW1zKSA9PiBwYXJhbXMuc3JjbGFuZyA/IHBhcmFtcy5zcmNsYW5nIDogJ3NyYydcbiAgICAgICAgfSxcbiAgICAgICAgdHJnOiB7XG4gICAgICAgICAgdHlwZTogJ2ZpbGU8dGV4dD4nLFxuICAgICAgICAgIHRpdGxlOiAocCwgcGFyYW1zKSA9PiBwYXJhbXMudHJnbGFuZyA/IHBhcmFtcy50cmdsYW5nIDogJ3RyZydcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB0b1RpdGxlOiAocCwgcGFyYW1zKSA9PiB7XG4gICAgICAgIGlmIChwYXJhbXMuY29ycHVzKSByZXR1cm4gYE9QVVMgKCR7cGFyYW1zLmNvcnB1c30pYDtcbiAgICAgICAgcmV0dXJuIGBPUFVTYDtcbiAgICAgIH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAnVEVNUD0kKHNoZWxsIG1rdGVtcCkgJiYgXFxcXCcsXG4gICAgICAgICAgYHdnZXQgaHR0cDovL29wdXMubGluZ2ZpbC51dS5zZS8ke3BhcmFtcy5jb3JwdXN9LyR7cGFyYW1zLnNyY2xhbmd9LSR7cGFyYW1zLnRyZ2xhbmd9LnR4dC56aXAgLU8gJCRURU1QICYmIFxcXFxgLFxuICAgICAgICAgIGB1bnppcCAtcCAkJFRFTVAgJHtwYXJhbXMuY29ycHVzfS4ke3BhcmFtcy5zcmNsYW5nfS0ke3BhcmFtcy50cmdsYW5nfS4ke3BhcmFtcy5zcmNsYW5nfSA+ICR7b3V0cHV0LnNyY30gJiYgXFxcXGAsXG4gICAgICAgICAgYHVuemlwIC1wICQkVEVNUCAke3BhcmFtcy5jb3JwdXN9LiR7cGFyYW1zLnNyY2xhbmd9LSR7cGFyYW1zLnRyZ2xhbmd9LiR7cGFyYW1zLnRyZ2xhbmd9ID4gJHtvdXRwdXQudHJnfSAmJiBcXFxcYCxcbiAgICAgICAgICAncm0gJCRURU1QJ1xuICAgICAgICBdO1xuICAgICAgfVxuICAgIH0sXG4gICAgdG9rZW5pemVyOiB7XG4gICAgICB0eXBlOiAndG9rZW5pemVyJywgdGl0bGU6ICdUb2tlbml6ZXIgKG1vc2VzKScsIGNhdGVnb3J5OiAnY29ycG9yYScsXG4gICAgICBwYXJhbXM6IHsgbGFuZzogeyB0eXBlOiAnbGFuZ3VhZ2UnLCBkZWZhdWx0OiAnJHNyY2xhbmcnIH0gfSxcbiAgICAgIGlucHV0OiB7IGluOiAnZmlsZTx0ZXh0PicgfSxcbiAgICAgIG91dHB1dDogeyBvdXQ6ICdmaWxlPHRvaz4nIH0sXG4gICAgICB0b1RpdGxlOiAocCwgcGFyYW1zKSA9PiBwYXJhbXMubGFuZyA/IGBUb2tlbml6ZXIgWyR7cGFyYW1zLmxhbmd9XSAobW9zZXMpYCA6IHAudGl0bGUsXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgcmV0dXJuIFtgcGVybCAvdG9vbHMvc2NyaXB0cy90b2tlbml6ZXIvdG9rZW5pemVyLnBlcmwgLWwgJHtwYXJhbXMubGFuZ30gPCAke2lucHV0LmlufSA+ICR7b3V0cHV0Lm91dH1gXTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGtlbmxtOiB7XG4gICAgICB0eXBlOiAna2VubG0nLCB0aXRsZTogJ0tlbkxNJywgY2F0ZWdvcnk6ICdsbScsXG4gICAgICBwYXJhbXM6IHtcbiAgICAgICAgb3JkZXI6IHsgdHlwZTogJ3VpbnRlZ2VyJywgZGVmYXVsdDogJyRsbS1vcmRlcicgfSxcbiAgICAgICAgbWVtb3J5OiB7IHR5cGU6ICdzaXplLXVuaXQnLCBkZWZhdWx0OiAnJG1lbW9yeScsIG5vaGFzaDogdHJ1ZSB9LFxuICAgICAgICB0b29sc2RpcjogeyB0eXBlOiAncGF0aCcsIGRlZmF1bHQ6ICckdG9vbHNkaXInIH0sXG4gICAgICAgIHRlbXBkaXI6IHsgdHlwZTogJ3BhdGgnLCBkZWZhdWx0OiAnJHRlbXBkaXInLCBub2hhc2g6IHRydWUgfVxuICAgICAgfSxcbiAgICAgIGlucHV0OiB7IGluOiAnZmlsZTx0b2s+JyB9LFxuICAgICAgb3V0cHV0OiB7IG91dDogJ2ZpbGU8YXJwYT4nIH0sXG4gICAgICB0b1RpdGxlOiAocCwgcGFyYW1zKSA9PiB7XG4gICAgICAgIHJldHVybiAnS2VuTE0nICsgKHBhcmFtcy5vcmRlciA/IGAsIG9yZGVyID0gJHtwYXJhbXMub3JkZXJ9YCA6ICcnKTtcbiAgICAgIH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcbiAgICAgICAgaWYgKHBhcmFtcy50ZW1wZGlyKSBhcmdzLnB1c2goYC1UICR7cGFyYW1zLnRlbXBkaXJ9YCk7XG4gICAgICAgIGlmIChwYXJhbXMubWVtb3J5KSBhcmdzLnB1c2goYC1TICR7cGFyYW1zLm1lbW9yeX1gKTtcbiAgICAgICAgcmV0dXJuIFtgJHtwYXJhbXMudG9vbHNkaXJ9L2xtcGx6IC1vICR7cGFyYW1zLm9yZGVyfSAke2FyZ3Muam9pbignICcpfSA8ICR7aW5wdXQuaW59ID4gJHtvdXRwdXQub3V0fWBdO1xuICAgICAgfVxuICAgIH0sXG4gICAgYmluYXJwYToge1xuICAgICAgdHlwZTogJ2JpbmFycGEnLCB0aXRsZTogJ0JpbmFyaXplIExNJywgY2F0ZWdvcnk6ICdsbScsXG4gICAgICBwYXJhbXM6IHtcbiAgICAgICAgdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVmYXVsdDogJ3RyaWUnIH0sXG4gICAgICAgIG1lbW9yeTogeyB0eXBlOiAnc2l6ZS11bml0JywgZGVmYXVsdDogJyRtZW1vcnknLCBub2hhc2g6IHRydWUgfSxcbiAgICAgICAgdG9vbHNkaXI6IHsgdHlwZTogJ3BhdGgnLCBkZWZhdWx0OiAnJHRvb2xzZGlyJyB9LFxuICAgICAgICB0ZW1wZGlyOiB7IHR5cGU6ICdwYXRoJywgZGVmYXVsdDogJyR0ZW1wZGlyJywgbm9oYXNoOiB0cnVlIH1cbiAgICAgIH0sXG4gICAgICBpbnB1dDogeyBpbjogJ2ZpbGU8YXJwYT4nIH0sXG4gICAgICBvdXRwdXQ6IHsgb3V0OiAnZmlsZTxsbS1iaW4+JyB9LFxuICAgICAgdG9CYXNoOiAocGFyYW1zLCBpbnB1dCwgb3V0cHV0KSA9PiB7XG4gICAgICAgIHZhciBhcmdzID0gW107XG4gICAgICAgIGlmIChwYXJhbXMudGVtcGRpcikgYXJncy5wdXNoKGAtVCAke3BhcmFtcy50ZW1wZGlyfWApO1xuICAgICAgICBpZiAocGFyYW1zLm1lbW9yeSkgYXJncy5wdXNoKGAtUyAke3BhcmFtcy5tZW1vcnl9YCk7XG4gICAgICAgIHJldHVybiBbYCR7cGFyYW1zLnRvb2xzZGlyfS9idWlsZF9iaW5hcnkgJHtwYXJhbXMudHlwZX0gJHthcmdzLmpvaW4oJyAnKX0gJHtpbnB1dC5pbn0gJHtvdXRwdXQub3V0fWBdO1xuICAgICAgfVxuICAgIH0sXG4gICAgZmFzdGFsaWduOiB7XG4gICAgICB0eXBlOiAnZmFzdGFsaWduJywgdGl0bGU6ICdGYXN0IGFsaWduJywgY2F0ZWdvcnk6ICdhbGlnbm1lbnQnLCB2ZXJzaW9uOiAxLFxuICAgICAgcGFyYW1zOiB7XG4gICAgICAgIHJldmVyc2U6IHsgdHlwZTogJ2Jvb2wnLCBkZWZhdWx0OiBmYWxzZSB9LFxuICAgICAgICB0b29sc2RpcjogeyB0eXBlOiAncGF0aCcsIGRlZmF1bHQ6ICckdG9vbHNkaXInIH0sXG4gICAgICAgIHRlbXBkaXI6IHsgdHlwZTogJ3BhdGgnLCBkZWZhdWx0OiAnJHRlbXBkaXInIH0sXG4gICAgICB9LFxuICAgICAgaW5wdXQ6IHsgc3JjOiAnZmlsZTx0b2s+JywgdHJnOiAnZmlsZTx0b2s+JyB9LFxuICAgICAgb3V0cHV0OiB7IG91dDogJ2ZpbGU8YWxpZ24+JyB9LFxuICAgICAgdG9UaXRsZTogKHAsIHBhcmFtcykgPT4gJ2Zhc3QgYWxpZ24nICsgKHBhcmFtcy5yZXZlcnNlID09PSB0cnVlIHx8IHBhcmFtcy5yZXZlcnNlID09ICd0cnVlJyA/ICcgKHJldmVyc2UpJyA6ICcnKSxcbiAgICAgIHRvQmFzaDogKHBhcmFtcywgaW5wdXQsIG91dHB1dCkgPT4ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgIGBURU1QPSQoc2hlbGwgbWt0ZW1wIC0tdG1wZGlyPSR7cGFyYW1zLnRlbXBkaXJ9KSAmJiBcXFxcYCxcbiAgICAgICAgICBgJHtwYXJhbXMudG9vbHNkaXJ9L3ByZXBfZmFzdF9hbGlnbiAke2lucHV0LnNyY30gJHtpbnB1dC50cmd9ID4gJCRURU1QICYmIFxcXFxgLFxuICAgICAgICAgIGAke3BhcmFtcy50b29sc2Rpcn0vZmFzdF9hbGlnbiAke3BhcmFtcy5yZXZlcnNlID8gJy1yJyA6ICcnfSAtaSAkJFRFTVAgPiAke291dHB1dC5vdXR9ICYmIFxcXFxgLFxuICAgICAgICAgICdybSAkJFRFTVAnXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9LFxuICAgIHN5bWFsaWduOiB7XG4gICAgICB0eXBlOiAnc3ltYWxpZ24nLCB0aXRsZTogJ1N5bSBhbGlnbm1lbnRzJywgY2F0ZWdvcnk6ICdhbGlnbm1lbnQnLFxuICAgICAgcGFyYW1zOiB7XG4gICAgICAgIG1ldGhvZDogeyB0eXBlOiAnc3RyaW5nJywgZGVmYXVsdDogJ2dyb3ctZGlhZy1maW5hbC1hbmQnIH0sXG4gICAgICAgIHRvb2xzZGlyOiB7IHR5cGU6ICdwYXRoJywgZGVmYXVsdDogJyR0b29sc2RpcicgfSxcbiAgICAgIH0sXG4gICAgICBpbnB1dDogeyBzcmN0cmc6ICdmaWxlPGFsaWduPicsIHRyZ3NyYzogJ2ZpbGU8YWxpZ24+JyB9LFxuICAgICAgb3V0cHV0OiB7IG91dDogJ2ZpbGU8YWxpZ24+JyB9LFxuICAgICAgdG9CYXNoOiAocGFyYW1zLCBpbnB1dCwgb3V0cHV0KSA9PiB7XG4gICAgICAgIHJldHVybiBbYCR7cGFyYW1zLnRvb2xzZGlyfS9hdG9vbHMgLWMgJHtwYXJhbXMubWV0aG9kfSAtaSAke2lucHV0LnNyY3RyZ30gLWogJHtpbnB1dC50cmdzcmN9ID4gJHtvdXRwdXQub3V0fWBdO1xuICAgICAgfVxuICAgIH0sXG4gICAgcGhyYXNlczoge1xuICAgICAgdHlwZTogJ3BocmFzZXMnLCBjYXRlZ29yeTogJ3BocmFzZXMnLFxuICAgICAgcGFyYW1zOiB7IG1heExlbmd0aDogJ2ludCcsIG1vZGVsOiAnc3RyaW5nJyB9LFxuICAgICAgaW5wdXQ6IHsgc3JjOiAnZmlsZTx0b2s+JywgdHJnOiAnZmlsZTx0b2s+JywgYWxnbjogJ2ZpbGU8YWxpZ24+JyB9LFxuICAgICAgb3V0cHV0OiB7IG91dDogJ2ZpbGU8cGhyYXNlcz4nLCBpbnY6ICdmaWxlPHBocmFzZXM+JywgbzogJ2ZpbGU8YW55PicgfSxcbiAgICAgIHRvQmFzaDogKHBhcmFtcywgaW5wdXQsIG91dHB1dCkgPT4ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICdURU1QPSQoc2hlbGwgbWt0ZW1wIC1kKSAmJiBcXFxcJyxcbiAgICAgICAgICBgL3Rvb2xzL2V4dHJhY3QgJHtpbnB1dC50cmd9ICR7aW5wdXQuc3JjfSAke2lucHV0LmFsZ259ICQkVEVNUC9leHRyYWN0ICR7cGFyYW1zLm1heExlbmd0aH0gb3JpZW50YXRpb24gLS1tb2RlbCAke3BhcmFtcy5tb2RlbH0gJiYgXFxcXGAsXG4gICAgICAgICAgYExDX0FMTD1DIHNvcnQgJCRURU1QL2V4dHJhY3QgLVQgJCRURU1QID4gJHtvdXRwdXQub3V0fSAmJiBcXFxcYCxcbiAgICAgICAgICBgTENfQUxMPUMgc29ydCAkJFRFTVAvZXh0cmFjdC5pbnYgLVQgJCRURU1QID4gJHtvdXRwdXQuaW52fSAmJiBcXFxcYCxcbiAgICAgICAgICBgTENfQUxMPUMgc29ydCAkJFRFTVAvZXh0cmFjdC5vIC1UICQkVEVNUCA+ICR7b3V0cHV0Lm99ICYmIFxcXFxgLFxuICAgICAgICAgICdybSAtciAkJFRFTVAnXG4gICAgICAgIF07XG4gICAgICB9XG4gICAgfSxcbiAgICBsZXhpY2FsOiB7XG4gICAgICB0eXBlOiAnbGV4aWNhbCcsIGNhdGVnb3J5OiAncGhyYXNlcycsXG4gICAgICBwYXJhbXM6IHsgfSxcbiAgICAgIGlucHV0OiB7IHNyYzogJ2ZpbGU8dG9rPicsIHRyZzogJ2ZpbGU8dG9rPicsIGFsZ246ICdmaWxlPGFsaWduPicgfSxcbiAgICAgIG91dHB1dDogeyBzcmN0cmc6ICdmaWxlPGxleD4nLCB0cmdzcmM6ICdmaWxlPGxleD4nIH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAnVEVNUD0kKHNoZWxsIG1rdGVtcCAtZCkgJiYgXFxcXCcsXG4gICAgICAgICAgYHBlcmwgL3Rvb2xzL3NjcmlwdHMvdHJhaW5pbmcvZ2V0LWxleGljYWwucGVybCAke2lucHV0LnNyY30gJHtpbnB1dC50cmd9ICR7aW5wdXQuYWxnbn0gJCRURU1QL2xleCAmJiBcXFxcYCxcbiAgICAgICAgICBgbXYgJCRURU1QL2xleC5lMmYgJHtvdXRwdXQuc3JjdHJnfSAmJiBcXFxcYCxcbiAgICAgICAgICBgbXYgJCRURU1QL2xleC5mMmUgJHtvdXRwdXQudHJnc3JjfSAmJiBcXFxcYCxcbiAgICAgICAgICAncm0gLXIgJCRURU1QJ1xuICAgICAgICBdO1xuICAgICAgfVxuICAgIH0sXG4gICAgcGhyYXNlc2NvcmU6IHtcbiAgICAgIHR5cGU6ICdwaHJhc2VzY29yZScsIGNhdGVnb3J5OiAncGhyYXNlcycsXG4gICAgICBwYXJhbXM6IHsgfSxcbiAgICAgIGlucHV0OiB7IHBocjogJ2ZpbGU8cGhyYXNlcz4nLCBwaHJpbnY6ICdmaWxlPHBocmFzZXM+Jywgc3JjdHJnOiAnZmlsZTxsZXg+JywgdHJnc3JjOiAnZmlsZTxsZXg+JyB9LFxuICAgICAgb3V0cHV0OiB7IHB0YWJsZTogJ2ZpbGU8cGhyYXNlLXRhYmxlPicgfSxcbiAgICAgIHRvQmFzaDogKHBhcmFtcywgaW5wdXQsIG91dHB1dCkgPT4ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICdURU1QPSQoc2hlbGwgbWt0ZW1wIC1kKSAmJiBcXFxcJyxcbiAgICAgICAgICBgL3Rvb2xzL3Njb3JlICR7aW5wdXQucGhyfSAke2lucHV0LnRyZ3NyY30gL2Rldi9zdGRvdXQgPiAkJFRFTVAvdHJnc3JjICYmIFxcXFxgLFxuICAgICAgICAgIGAvdG9vbHMvc2NvcmUgJHtpbnB1dC5waHJpbnZ9ICR7aW5wdXQuc3JjdHJnfSAvZGV2L3N0ZG91dCAtLUludmVyc2UgPiAkJFRFTVAvc3JjdHJnICYmIFxcXFxgLFxuICAgICAgICAgIGBMQ19BTEw9QyBzb3J0ICQkVEVNUC9zcmN0cmcgLVQgJCRURU1QIHwgZ3ppcCA+ICQkVEVNUC9zcmN0cmcuc29ydGVkLmd6ICYmIFxcXFxgLFxuICAgICAgICAgIGBMQ19BTEw9QyBzb3J0ICQkVEVNUC90cmdzcmMgLVQgJCRURU1QIHwgZ3ppcCA+ICQkVEVNUC90cmdzcmMuc29ydGVkLmd6ICYmIFxcXFxgLFxuICAgICAgICAgIGAvdG9vbHMvY29uc29saWRhdGUgJCRURU1QL3RyZ3NyYy5zb3J0ZWQuZ3ogJCRURU1QL3NyY3RyZy5zb3J0ZWQuZ3ogJHtvdXRwdXQucHRhYmxlfSAmJiBcXFxcYCxcbiAgICAgICAgICAncm0gLXIgJCRURU1QJ1xuICAgICAgICBdO1xuICAgICAgfVxuICAgIH0sXG4gICAgcGhyYXNlc2Jpbjoge1xuICAgICAgdHlwZTogJ3BocmFzZXNiaW4nLCBjYXRlZ29yeTogJ3BocmFzZXMnLFxuICAgICAgaW5wdXQ6IHsgcHRhYmxlOiAnZmlsZTxwaHJhc2UtdGFibGU+JyB9LFxuICAgICAgb3V0cHV0OiB7IG1pbnBocjogJ2ZpbGU8cGhyYXNlLXRhYmxlLWJpbj4nIH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICBgL3Rvb2xzL3Byb2Nlc3NQaHJhc2VUYWJsZU1pbiAtbnNjb3JlcyA0IC10aHJlYWRzIDEgLWluICR7aW5wdXQucHRhYmxlfSAtb3V0ICR7b3V0cHV0Lm1pbnBocn1gLFxuICAgICAgICAgIC8vYG12ICR7b3V0cHV0LmJpbn0ubWlucGhyICR7b3V0cHV0LmJpbn1gXG4gICAgICAgIF07XG4gICAgICB9XG4gICAgfSxcbiAgICByZW9yZGVyaW5nOiB7XG4gICAgICB0eXBlOiAncmVvcmRlcmluZycsIGNhdGVnb3J5OiAncGhyYXNlcycsXG4gICAgICBwYXJhbXM6IHsgbW9kZWw6ICdzdHJpbmcnLCB0eXBlOiAnc3RyaW5nJywgb3JpZW50YXRpb246ICdzdHJpbmcnLCBzbW9vdGhpbmc6ICdmbG9hdCcgfSxcbiAgICAgIGlucHV0OiB7IHBocjogJ2ZpbGU8YW55PicgfSxcbiAgICAgIG91dHB1dDogeyByZW9yZDogJ2ZpbGU8cmVvcmRlcmluZz4nIH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAnVEVNUD0kKHNoZWxsIG1rdGVtcCAtZCkgJiYgXFxcXCcsXG4gICAgICAgICAgYC90b29scy9sZXhpY2FsLXJlb3JkZXJpbmctc2NvcmUgJHtpbnB1dC5waHJ9ICR7cGFyYW1zLnNtb290aGluZ30gJCRURU1QL291dHB1dC4gLS1tb2RlbCBcIiR7cGFyYW1zLnR5cGV9ICR7cGFyYW1zLm9yaWVudGF0aW9ufSAke3BhcmFtcy5tb2RlbH1cIiAmJiBcXFxcYCxcbiAgICAgICAgICBgemNhdCAkJFRFTVAvb3V0cHV0LiR7cGFyYW1zLm1vZGVsfS5neiA+ICR7b3V0cHV0LnJlb3JkfSAmJiBcXFxcYCxcbiAgICAgICAgICAncm0gLXIgJCRURU1QJ1xuICAgICAgICBdO1xuICAgICAgfVxuICAgIH0sXG4gICAgcmVvcmRlcmluZ2Jpbjoge1xuICAgICAgdHlwZTogJ3Jlb3JkZXJpbmdiaW4nLCBjYXRlZ29yeTogJ3BocmFzZXMnLFxuICAgICAgaW5wdXQ6IHsgcmVvcmQ6ICdmaWxlPHJlb3JkZXJpbmc+JyB9LFxuICAgICAgb3V0cHV0OiB7IG1pbmxleHI6ICdmaWxlPHJlb3JkZXJpbmctYmluPicgfSxcbiAgICAgIHRvQmFzaDogKHBhcmFtcywgaW5wdXQsIG91dHB1dCkgPT4ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgIGAvdG9vbHMvcHJvY2Vzc0xleGljYWxUYWJsZU1pbiAtdGhyZWFkcyAxIC1pbiAke2lucHV0LnJlb3JkfSAtb3V0ICR7b3V0cHV0Lm1pbmxleHJ9YCxcbiAgICAgICAgICAvL2BtdiAke291dHB1dC5yZW9yZH0ubWlubGV4ciAke291dHB1dC5yZW9yZH1gXG4gICAgICAgIF07XG4gICAgICB9XG4gICAgfSxcbiAgICBlY2hvOiB7XG4gICAgICB0eXBlOiAnZWNobycsIGNhdGVnb3J5OiAnY29ycG9yYScsXG4gICAgICBpbnB1dDogeyB9LFxuICAgICAgb3V0cHV0OiB7IG91dDogJ2ZpbGU8dGV4dD4nIH0sXG4gICAgICBwYXJhbXM6IHsgdGV4dDogJ3N0cmluZycgfSxcbiAgICAgIHRvQmFzaDogKHBhcmFtcywgaW5wdXQsIG91dHB1dCkgPT4ge1xuICAgICAgICByZXR1cm4gW2BlY2hvIFwiJHtwYXJhbXMudGV4dH1cIiA+ICR7b3V0cHV0Lm91dH1gXTtcbiAgICAgIH1cbiAgICB9LFxuICAgICdtb3Nlcy1pbmknOiB7XG4gICAgICB0eXBlOiAnbW9zZXMtaW5pJywgdGl0bGU6ICdNb3NlcyBJTkknLCBjYXRlZ29yeTogJ2RlY29kZXInLFxuICAgICAgd2lkdGg6IDMwMCxcbiAgICAgIGlucHV0OiB7IHBocjogWydmaWxlPHBocmFzZS10YWJsZT4nLCAnZmlsZTxwaHJhc2UtdGFibGUtYmluJ10sIGxtOiAnZmlsZTxiaW5sbT4nLCByZW9yZDogJ2ZpbGU8cmVvcmQ+Jywgc2FtcGxlOiAnc2FtcGxpbmcnIH0sXG4gICAgICBvdXRwdXQ6IHsgaW5pOiAnZmlsZTxtb3Nlcz4nIH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgdmFyIGluaSA9IFtdO1xuICAgICAgICBpbmkucHVzaCgnW2lucHV0LWZhY3RvcnNdJylcbiAgICAgICAgaW5pLnB1c2goJzAnKTtcbiAgICAgICAgaW5pLnB1c2goJ1ttYXBwaW5nXScpO1xuICAgICAgICBpbmkucHVzaCgnMCBUIDAnKTtcbiAgICAgICAgaW5pLnB1c2goJ1tkaXN0b3J0aW9uLWxpbWl0XScpO1xuICAgICAgICBpbmkucHVzaCgnNicpO1xuICAgICAgICBpbmkucHVzaCgnW2ZlYXR1cmVdJyk7XG4gICAgICAgIGluaS5wdXNoKCdVbmtub3duV29yZFBlbmFsdHknKTtcbiAgICAgICAgaW5pLnB1c2goJ1dvcmRQZW5hbHR5Jyk7XG4gICAgICAgIGluaS5wdXNoKCdQaHJhc2VQZW5hbHR5Jyk7XG4gICAgICAgIGluaS5wdXNoKCdEaXN0b3J0aW9uJyk7XG4gICAgICAgIGlmIChpbnB1dC5waHIpIGluaS5wdXNoKGBQaHJhc2VEaWN0aW9uYXJ5Q29tcGFjdCBuYW1lPVRyYW5zbGF0aW9uTW9kZWwwIG51bS1mZWF0dXJlcz00IHBhdGg9L3Rvb2xzL3RyYWluLyR7aW5wdXQucGhyfSBpbnB1dC1mYWN0b3I9MCBvdXRwdXQtZmFjdG9yPTBgKTtcbiAgICAgICAgaWYgKGlucHV0LnJlb3JkKSBpbmkucHVzaChgTGV4aWNhbFJlb3JkZXJpbmcgbmFtZT1MZXhpY2FsUmVvcmRlcmluZzAgbnVtLWZlYXR1cmVzPTYgdHlwZT13YmUtbXNkLWJpZGlyZWN0aW9uYWwtZmUtYWxsZmYgaW5wdXQtZmFjdG9yPTAgb3V0cHV0LWZhY3Rvcj0wIHBhdGg9L3Rvb2xzL3RyYWluLyR7aW5wdXQucmVvcmQucmVwbGFjZSgnLm1pbmxleHInLCAnJyl9YCk7XG4gICAgICAgIGlmIChpbnB1dC5sbSkgaW5pLnB1c2goYEtFTkxNIGxhenlrZW49MCBuYW1lPUxNMCBmYWN0b3I9MCBwYXRoPS90b29scy90cmFpbi8ke2lucHV0LmxtfSBvcmRlcj0zYCk7XG4gICAgICAgIGluaS5wdXNoKCdbd2VpZ2h0XScpO1xuICAgICAgICBpbmkucHVzaCgnVW5rbm93bldvcmRQZW5hbHR5MD0gMScpO1xuICAgICAgICBpbmkucHVzaCgnV29yZFBlbmFsdHkwPSAtMScpO1xuICAgICAgICBpbmkucHVzaCgnUGhyYXNlUGVuYWx0eTA9IDAuMicpO1xuICAgICAgICBpZiAoaW5wdXQucGhyKSBpbmkucHVzaCgnVHJhbnNsYXRpb25Nb2RlbDA9IDAuMiAwLjIgMC4yIDAuMicpO1xuICAgICAgICBpbmkucHVzaCgnRGlzdG9ydGlvbjA9IDAuMycpO1xuICAgICAgICBpZiAoaW5wdXQucmVvcmQpIGluaS5wdXNoKCdMZXhpY2FsUmVvcmRlcmluZzA9IDAuMyAwLjMgMC4zIDAuMyAwLjMgMC4zJyk7XG4gICAgICAgIGlmIChpbnB1dC5sbSkgaW5pLnB1c2goJ0xNMD0gMC41Jyk7XG5cbiAgICAgICAgdmFyIGNtZCA9IFtdO1xuICAgICAgICBjbWQucHVzaChgZWNobyA+ICR7b3V0cHV0LmluaX1gKTtcbiAgICAgICAgaW5pLmZvckVhY2gobCA9PiBjbWQucHVzaChgZWNobyBcIiR7bH1cIiA+PiAke291dHB1dC5pbml9YCkpO1xuICAgICAgICBpZiAoaW5wdXQuc2FtcGxlKSBjbWQucHVzaChgY2F0ICR7aW5wdXQuc2FtcGxlfS9tb3Nlcy5pbmkgPj4gJHtvdXRwdXQuaW5pfWApO1xuICAgICAgICByZXR1cm4gY21kO1xuICAgICAgfVxuICAgIH0sXG4gICAgbW9zZXM6IHtcbiAgICAgIHR5cGU6ICdtb3NlcycsIHRpdGxlOiAnbW9zZXMgZGVjb2RlcicsIGNhdGVnb3J5OiAnZGVjb2RlcicsXG4gICAgICBpbnB1dDogeyBpbjogJ2ZpbGU8dG9rPicsIGluaTogJ2ZpbGU8bW9zZXM+JyB9LFxuICAgICAgb3V0cHV0OiB7IG91dDogJ2ZpbGU8dG9rPicgfSxcbiAgICAgIHRvQmFzaDogKHBhcmFtcywgaW5wdXQsIG91dHB1dCkgPT4ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgIGBzdWRvIGRvY2tlciBydW4gLWEgc3RkaW4gLWEgc3Rkb3V0IC1hIHN0ZGVyciAtdiAvdG9vbHMvdHJhaW46L3Rvb2xzL3RyYWluIC1pIGdlcm1hbm4vbW9zZXMtcHJvZHVjdGlvbi5zdGF0aWMgL21vc2VzL2Jpbi9tb3NlcyAtZiAvdG9vbHMvdHJhaW4vJHtpbnB1dC5pbml9IDwgJHtpbnB1dC5pbn0gPiAke291dHB1dC5vdXR9YFxuICAgICAgICBdO1xuICAgICAgfVxuICAgIH0sXG4gICAgYmxldToge1xuICAgICAgdHlwZTogJ2JsZXUnLCB0aXRsZTogJ0JMRVUnLCBjYXRlZ29yeTogJ2V2YWx1YXRpb24nLFxuICAgICAgaW5wdXQ6IHsgdHJhbnM6ICdmaWxlPHRleHQ+Jywgc3JjOiAnZmlsZTx0ZXh0PicsIHJlZjogJ2ZpbGU8dGV4dD4nIH0sXG4gICAgICBvdXRwdXQ6IHsgb3V0OiAnZmlsZTxibGV1PicgfSxcbiAgICAgIHBhcmFtczogeyBjYXNlOiAnYm9vbCcgfSxcbiAgICAgIHRvQmFzaDogKHBhcmFtcywgaW5wdXQsIG91dHB1dCkgPT4ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICdURU1QPSQoc2hlbGwgbWt0ZW1wIC1kKSAmJiBcXFxcJyxcbiAgICAgICAgICBgcGVybCAvdG9vbHMvd3JhcC1zZ20ucGVybCByZWYgeHggeXkgPCAke2lucHV0LnJlZn0gPiAkJFRFTVAvcmVmLnNnbSAmJiBcXFxcYCxcbiAgICAgICAgICBgcGVybCAvdG9vbHMvd3JhcC1zZ20ucGVybCBzcmMgeHggPCAke2lucHV0LnNyY30gPiAkJFRFTVAvc3JjLnNnbSAmJiBcXFxcYCxcbiAgICAgICAgICBgcGVybCAvdG9vbHMvc2NyaXB0cy9lbXMvc3VwcG9ydC93cmFwLXhtbC5wZXJsIHl5ICQkVEVNUC9zcmMuc2dtIDwgJHtpbnB1dC50cmFuc30gPiAkJFRFTVAvdHJhbnMuc2dtICYmIFxcXFxgLFxuICAgICAgICAgIGBwZXJsIC90b29scy9zY3JpcHRzL2dlbmVyaWMvbXRldmFsLXYxM2EucGwgLXMgJCRURU1QL3NyYy5zZ20gLXIgJCRURU1QL3JlZi5zZ20gLXQgJCRURU1QL3RyYW5zLnNnbSAtYiAtZCAzICR7cGFyYW1zLmNhc2UgPyAnLWMnIDogJyd9ID4gJHtvdXRwdXQub3V0fSAmJiBcXFxcYCxcbiAgICAgICAgICBgY2F0ICR7b3V0cHV0Lm91dH0gJiYgXFxcXGAsXG4gICAgICAgICAgJ3JtIC1yICQkVEVNUCdcbiAgICAgICAgXTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGRldG9rZW5pemVyOiB7XG4gICAgICB0eXBlOiAnZGV0b2tlbml6ZXInLCB0aXRsZTogJ0RldG9rZW5pemVyIChtb3NlcyknLCBjYXRlZ29yeTogJ2NvcnBvcmEnLFxuICAgICAgaW5wdXQ6IHsgaW46ICdmaWxlPHRvaz4nIH0sXG4gICAgICBvdXRwdXQ6IHsgb3V0OiAnZmlsZTx0ZXh0PicgfSxcbiAgICAgIHBhcmFtczogeyBsYW5nOiAnbGFuZ3VhZ2UnIH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICBgcGVybCAvdG9vbHMvc2NyaXB0cy90b2tlbml6ZXIvZGV0b2tlbml6ZXIucGVybCAtbCAke3BhcmFtcy5sYW5nfSA8ICR7aW5wdXQuaW59ID4gJHtvdXRwdXQub3V0fWBcbiAgICAgICAgXTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGNvbXBhcmV2YWw6IHtcbiAgICAgIHR5cGU6ICdjb21wYXJldmFsJywgdGl0bGU6ICcgTVQtQ29tcGFyRXZhbCcsIGNhdGVnb3J5OiAnZXZhbHVhdGlvbicsXG4gICAgICBpbnB1dDogeyBzcmM6ICdmaWxlPHRvaz4nLCByZWY6ICdmaWxlPHRvaz4nLCB0cmFuczogJ2ZpbGU8dG9rPicgfSxcbiAgICAgIG91dHB1dDogeyB9LFxuICAgICAgcGFyYW1zOiB7IHNlcnZlcjogJ3N0cmluZycsIGV4cGVyaW1lbnQ6ICdzdHJpbmcnLCB0YXNrOiAnc3RyaW5nJyB9LFxuICAgICAgdG9CYXNoOiAocGFyYW1zLCBpbnB1dCwgb3V0cHV0KSA9PiB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgYEVYUElEPSQoc2hlbGwgY3VybCAtcyAtWCBQT1NUIC1GIFwibmFtZT0ke3BhcmFtcy5leHBlcmltZW50fVwiIC1GIFwiZGVzY3JpcHRpb249JHtwYXJhbXMuZXhwZXJpbWVudH1cIiAtRiBcInNvdXJjZT1AJHtpbnB1dC5zcmN9XCIgLUYgXCJyZWZlcmVuY2U9QCR7aW5wdXQucmVmfVwiICR7cGFyYW1zLnNlcnZlcn0vYXBpL2V4cGVyaW1lbnRzL3VwbG9hZCB8IGpxIFwiLmV4cGVyaW1lbnRfaWRcIikgJiYgXFxcXGAsXG4gICAgICAgICAgYGN1cmwgLXMgLVggUE9TVCAtRiBcIm5hbWU9JHtwYXJhbXMudGFza31cIiAtRiBcImRlc2NyaXB0aW9uPSR7cGFyYW1zLnRhc2t9XCIgLUYgXCJleHBlcmltZW50X2lkPSQkRVhQSURcIiAtRiBcInRyYW5zbGF0aW9uPUAke2lucHV0LnRyYW5zfVwiICR7cGFyYW1zLnNlcnZlcn0vYXBpL3Rhc2tzL3VwbG9hZGBcbiAgICAgICAgXTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGJpbnRleHQ6IHtcbiAgICAgIHR5cGU6ICdiaW50ZXh0JywgdGl0bGU6ICdCaW5hcml6ZSB0ZXh0JywgY2F0ZWdvcnk6ICdwaHJhc2VzJyxcbiAgICAgIGlucHV0OiB7IGluOiAnZmlsZTx0b2s+JyB9LFxuICAgICAgb3V0cHV0OiB7IG91dDogJ2RpcjxiaW4+JyB9LFxuICAgICAgcGFyYW1zOiB7IH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICBgcm0gLXJmICR7b3V0cHV0Lm91dH1gLFxuICAgICAgICAgIGBta2RpciAke291dHB1dC5vdXR9YCxcbiAgICAgICAgICBgL3Rvb2xzL210dC1idWlsZCAtaSAtbyAke291dHB1dC5vdXR9L2NvcnB1cyA8ICR7aW5wdXQuaW59YCxcbiAgICAgICAgXTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGJpbmFsaWduOiB7XG4gICAgICB0eXBlOiAnYmluYWxpZ24nLCB0aXRsZTogJ0JpbmFyaXplIGFsaWduJywgY2F0ZWdvcnk6ICdwaHJhc2VzJyxcbiAgICAgIGlucHV0OiB7IGluOiAnZmlsZTxhbGlnbj4nIH0sXG4gICAgICBvdXRwdXQ6IHsgb3V0OiAnZmlsZTxiaW4+JyB9LFxuICAgICAgcGFyYW1zOiB7IH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICBgL3Rvb2xzL3N5bWFsMm1hbSAke291dHB1dC5vdXR9IDwgJHtpbnB1dC5pbn1gLFxuICAgICAgICBdO1xuICAgICAgfVxuICAgIH0sXG4gICAgYmlubGV4OiB7XG4gICAgICB0eXBlOiAnYmlubGV4JywgdGl0bGU6ICdCaW5hcml6ZSBsZXgnLCBjYXRlZ29yeTogJ3BocmFzZXMnLFxuICAgICAgaW5wdXQ6IHsgc3JjOiAnZGlyPGJpbj4nLCB0cmc6ICdkaXI8YmluPicsIGFsZ246ICdmaWxlPGJpbj4nIH0sXG4gICAgICBvdXRwdXQ6IHsgb3V0OiAnZmlsZTxiaW4+JyB9LFxuICAgICAgcGFyYW1zOiB7IH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAnVEVNUD0kKHNoZWxsIG1rdGVtcCAtZCkgJiYgXFxcXCcsXG4gICAgICAgICAgYGxuIC1zIFxcYHJlYWRsaW5rIC1mICR7aW5wdXQuc3JjfS9jb3JwdXMubWN0XFxgICQkVEVNUC9jb3JwdXMuc3JjLm1jdCAmJiBcXFxcYCxcbiAgICAgICAgICBgbG4gLXMgXFxgcmVhZGxpbmsgLWYgJHtpbnB1dC5zcmN9L2NvcnB1cy5zZmFcXGAgJCRURU1QL2NvcnB1cy5zcmMuc2ZhICYmIFxcXFxgLFxuICAgICAgICAgIGBsbiAtcyBcXGByZWFkbGluayAtZiAke2lucHV0LnNyY30vY29ycHVzLnRkeFxcYCAkJFRFTVAvY29ycHVzLnNyYy50ZHggJiYgXFxcXGAsXG4gICAgICAgICAgYGxuIC1zIFxcYHJlYWRsaW5rIC1mICR7aW5wdXQudHJnfS9jb3JwdXMubWN0XFxgICQkVEVNUC9jb3JwdXMudHJnLm1jdCAmJiBcXFxcYCxcbiAgICAgICAgICBgbG4gLXMgXFxgcmVhZGxpbmsgLWYgJHtpbnB1dC50cmd9L2NvcnB1cy5zZmFcXGAgJCRURU1QL2NvcnB1cy50cmcuc2ZhICYmIFxcXFxgLFxuICAgICAgICAgIGBsbiAtcyBcXGByZWFkbGluayAtZiAke2lucHV0LnRyZ30vY29ycHVzLnRkeFxcYCAkJFRFTVAvY29ycHVzLnRyZy50ZHggJiYgXFxcXGAsXG4gICAgICAgICAgYGxuIC1zIFxcYHJlYWRsaW5rIC1mICR7aW5wdXQuYWxnbn1cXGAgJCRURU1QL2NvcnB1cy5zcmMtdHJnLm1hbSAmJiBcXFxcYCxcbiAgICAgICAgICBgL3Rvb2xzL21tbGV4LWJ1aWxkICQkVEVNUC9jb3JwdXMuIHNyYyB0cmcgLW8gJHtvdXRwdXQub3V0fSAmJiBcXFxcYCxcbiAgICAgICAgICAncm0gLXJmICQkVEVNUCdcbiAgICAgICAgXTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHBzYW1wbGVtb2RlbDoge1xuICAgICAgdHlwZTogJ3BzYW1wbGVtb2RlbCcsIHRpdGxlOiAnU2FtcGxpbmcgbW9kZWwnLCBjYXRlZ29yeTogJ3BocmFzZXMnLFxuICAgICAgaW5wdXQ6IHsgc3JjOiAnZGlyPGJpbj4nLCB0cmc6ICdkaXI8YmluPicsIGFsZ246ICdmaWxlPGJpbj4nLCBsZXg6ICdmaWxlPGJpbj4nIH0sXG4gICAgICBvdXRwdXQ6IHsgb3V0OiAnZGlyJyB9LFxuICAgICAgcGFyYW1zOiB7IH0sXG4gICAgICB0b0Jhc2g6IChwYXJhbXMsIGlucHV0LCBvdXRwdXQpID0+IHtcbiAgICAgICAgdmFyIGluaSA9IFtdO1xuICAgICAgICBpbmkucHVzaCgnW2ZlYXR1cmVdJyk7XG4gICAgICAgIGluaS5wdXNoKCdMZXhpY2FsUmVvcmRlcmluZyBuYW1lPURNMCB0eXBlPWhpZXItbXNsci1iaWRpcmVjdGlvbmFsLWZlLWFsbGZmIGlucHV0LWZhY3Rvcj0wIG91dHB1dC1mYWN0b3I9MCcpO1xuICAgICAgICBpbmkucHVzaChgTW1zYXB0IG5hbWU9UFQwIGxyLWZ1bmM9RE0wIHBhdGg9L3Rvb2xzL3RyYWluLyR7b3V0cHV0Lm91dH0vIEwxPXNyYyBMMj10cmcgc2FtcGxlPTEwMDBgKTtcbiAgICAgICAgaW5pLnB1c2goJ1t3ZWlnaHRdJyk7XG4gICAgICAgIGluaS5wdXNoKCdETTA9IDAuMyAwLjMgMC4zIDAuMyAwLjMgMC4zIDAuMyAwLjMnKTtcblxuICAgICAgICB2YXIgY21kID0gW107XG4gICAgICAgIGNtZC5wdXNoKGBybSAtcmYgJHtvdXRwdXQub3V0fWApO1xuICAgICAgICBjbWQucHVzaChgbWtkaXIgJHtvdXRwdXQub3V0fWApO1xuICAgICAgICBjbWQucHVzaChgZWNobyA+ICR7b3V0cHV0Lm91dH0vbW9zZXMuaW5pYCk7XG4gICAgICAgIGNtZC5wdXNoKGBsbiAtcyBcXGByZWFkbGluayAtZiAke2lucHV0LnNyY30vY29ycHVzLm1jdFxcYCAke291dHB1dC5vdXR9L3NyYy5tY3RgKTtcbiAgICAgICAgY21kLnB1c2goYGxuIC1zIFxcYHJlYWRsaW5rIC1mICR7aW5wdXQuc3JjfS9jb3JwdXMuc2ZhXFxgICR7b3V0cHV0Lm91dH0vc3JjLnNmYWApO1xuICAgICAgICBjbWQucHVzaChgbG4gLXMgXFxgcmVhZGxpbmsgLWYgJHtpbnB1dC5zcmN9L2NvcnB1cy50ZHhcXGAgJHtvdXRwdXQub3V0fS9zcmMudGR4YCk7XG4gICAgICAgIGNtZC5wdXNoKGBsbiAtcyBcXGByZWFkbGluayAtZiAke2lucHV0LnRyZ30vY29ycHVzLm1jdFxcYCAke291dHB1dC5vdXR9L3RyZy5tY3RgKTtcbiAgICAgICAgY21kLnB1c2goYGxuIC1zIFxcYHJlYWRsaW5rIC1mICR7aW5wdXQudHJnfS9jb3JwdXMuc2ZhXFxgICR7b3V0cHV0Lm91dH0vdHJnLnNmYWApO1xuICAgICAgICBjbWQucHVzaChgbG4gLXMgXFxgcmVhZGxpbmsgLWYgJHtpbnB1dC50cmd9L2NvcnB1cy50ZHhcXGAgJHtvdXRwdXQub3V0fS90cmcudGR4YCk7XG4gICAgICAgIGNtZC5wdXNoKGBsbiAtcyBcXGByZWFkbGluayAtZiAke2lucHV0LmFsZ259XFxgICR7b3V0cHV0Lm91dH0vc3JjLXRyZy5tYW1gKTtcbiAgICAgICAgY21kLnB1c2goYGxuIC1zIFxcYHJlYWRsaW5rIC1mICR7aW5wdXQubGV4fVxcYCAke291dHB1dC5vdXR9L3NyYy10cmcubGV4YCk7XG4gICAgICAgIGluaS5mb3JFYWNoKGxpbmUgPT4gY21kLnB1c2goYGVjaG8gXCIke2xpbmV9XCIgPj4gJHtvdXRwdXQub3V0fS9tb3Nlcy5pbmlgKSk7XG4gICAgICAgIHJldHVybiBjbWQ7XG4gICAgICB9XG4gICAgfSxcbiAgICBtZXJ0OiB7XG4gICAgICB0eXBlOiAnbWVydCcsIHRpdGxlOiAnTUVSVCcsIGNhdGVnb3J5OiAndHVuaW5nJyxcbiAgICAgIGlucHV0OiB7IHNyYzogJ2ZpbGU8dG9rPicsIHJlZjogJ2ZpbGU8dG9rPicsIGluaTogJ2ZpbGU8aW5pPicgfSxcbiAgICAgIG91dHB1dDogeyBpbmk6ICdmaWxlPGluaT4nfSxcbiAgICAgIHBhcmFtczogeyB9LFxuICAgICAgdG9CYXNoOiAocGFyYW1zLCBpbnB1dCwgb3V0cHV0KSA9PiB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgJ1RFTVA9JChzaGVsbCBta3RlbXAgLWQpICYmIFxcXFwnLFxuICAgICAgICAgIGBwZXJsIC90b29scy9zY3JpcHRzL3RyYWluaW5nL21lcnQtbW9zZXMucGwgJHtpbnB1dC5zcmN9ICR7aW5wdXQucmVmfSAvdG9vbHMvbW9zZXMgJHtpbnB1dC5pbml9IC0tbm8tZmlsdGVyLXBocmFzZS10YWJsZSAtLW1lcnRkaXIgL3Rvb2xzLyAtLXdvcmtpbmctZGlyICQkVEVNUCAmJiBcXFxcYCxcbiAgICAgICAgICBgY3AgJCRURU1QL21vc2VzLmluaSAke291dHB1dC5pbml9ICYmIFxcXFxgLFxuICAgICAgICAgICdybSAtcmYgJCRURU1QJ1xuICAgICAgICBdO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgZ3JvdXBzOiB7XG4gICAgJ2xtLWtlbmxtJzoge1xuICAgICAgdHlwZTogJ2xtLWtlbmxtJywgdGl0bGU6ICdMYW5ndWFnZSBtb2RlbCcsIGNhdGVnb3J5OiAnbG0nLFxuICAgICAgcG9ydHM6IHsgaW46IFsndHJnJ10sIG91dDogWydsbSddIH0sXG4gICAgICBwcm9jZXNzZXM6IFtcbiAgICAgICAgeyBpZDogMiwgdHlwZTogJ2tlbmxtJywgcGFyYW1zOiB7IH0sIHg6IDIwLCB5OiA1MCwgd2lkdGg6IDE1MCwgaGVpZ2h0OiA1MCB9LFxuICAgICAgICB7IGlkOiAzLCB0eXBlOiAnYmluYXJwYScsIHBhcmFtczogeyB9LCB4OiAyMCwgeTogMTc1LCB3aWR0aDogMTUwLCBoZWlnaHQ6IDUwIH0sXG4gICAgICBdLFxuICAgICAgbGlua3M6IFtcbiAgICAgICAgeyBmcm9tOiB7IGlkOiAyLCBwb3J0OiAnb3V0JyB9LCB0bzogeyBpZDogMywgcG9ydDogJ2luJyB9IH0sXG4gICAgICAgIHsgZnJvbTogeyBpZDogdW5kZWZpbmVkLCBwb3J0OiAndHJnJyB9LCB0bzogeyBpZDogMiwgcG9ydDogJ2luJyB9IH0sXG4gICAgICAgIHsgZnJvbTogeyBpZDogMywgcG9ydDogJ291dCcgfSwgdG86IHsgaWQ6IHVuZGVmaW5lZCwgcG9ydDogJ2xtJyB9IH0sXG4gICAgICBdXG4gICAgfSxcbiAgICAncGhyYXNlc2FtcGxpbmcnOiB7XG4gICAgICB0eXBlOiAncGhyYXNlc2FtcGxpbmcnLCB0aXRsZTogJ1NhbXBsaW5nIFBocmFzZXMnLCBjYXRlZ29yeTogJ3BocmFzZXMnLFxuICAgICAgcG9ydHM6IHsgaW46IFsnc3JjJywgJ3RyZycsICdhbGduJ10sIG91dDogWydtb2RlbCddIH0sXG4gICAgICBwcm9jZXNzZXM6IFtcbiAgICAgICAgeyBpZDogMiwgdHlwZTogJ2JpbnRleHQnLCBwYXJhbXM6IHt9LCB4OiAyMCwgeTogNTAsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAgfSxcbiAgICAgICAgeyBpZDogMywgdHlwZTogJ2JpbnRleHQnLCBwYXJhbXM6IHt9LCB4OiAyMCwgeTogMTc1LCB3aWR0aDogMTUwLCBoZWlnaHQ6IDUwIH0sXG4gICAgICAgIHsgaWQ6IDQsIHR5cGU6ICdiaW5hbGlnbicsIHBhcmFtczoge30sIHg6IDIwLCB5OiAzNzUsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAgfSxcbiAgICAgICAgeyBpZDogNSwgdHlwZTogJ2JpbmxleCcsIHBhcmFtczoge30sIHg6IDIwLCB5OiA0NzUsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAgfSxcbiAgICAgICAgeyBpZDogNiwgdHlwZTogJ3BzYW1wbGVtb2RlbCcsIHBhcmFtczoge30sIHg6IDIwLCB5OiA1NzUsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAgfSxcbiAgICAgIF0sXG4gICAgICBsaW5rczogW1xuICAgICAgICB7IGZyb206IHsgaWQ6IHVuZGVmaW5lZCwgcG9ydDogJ3NyYycgfSwgdG86IHsgaWQ6IDIsIHBvcnQ6ICdpbicgfSB9LFxuICAgICAgICB7IGZyb206IHsgaWQ6IHVuZGVmaW5lZCwgcG9ydDogJ3RyZycgfSwgdG86IHsgaWQ6IDMsIHBvcnQ6ICdpbicgfSB9LFxuICAgICAgICB7IGZyb206IHsgaWQ6IHVuZGVmaW5lZCwgcG9ydDogJ2FsZ24nIH0sIHRvOiB7IGlkOiA0LCBwb3J0OiAnaW4nIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiAyLCBwb3J0OiAnb3V0JyB9LCB0bzogeyBpZDogNSwgcG9ydDogJ3NyYycgfSB9LFxuICAgICAgICB7IGZyb206IHsgaWQ6IDMsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiA1LCBwb3J0OiAndHJnJyB9IH0sXG4gICAgICAgIHsgZnJvbTogeyBpZDogNCwgcG9ydDogJ291dCcgfSwgdG86IHsgaWQ6IDYsIHBvcnQ6ICdhbGduJyB9IH0sXG4gICAgICAgIHsgZnJvbTogeyBpZDogMiwgcG9ydDogJ291dCcgfSwgdG86IHsgaWQ6IDYsIHBvcnQ6ICdzcmMnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiAzLCBwb3J0OiAnb3V0JyB9LCB0bzogeyBpZDogNiwgcG9ydDogJ3RyZycgfSB9LFxuICAgICAgICB7IGZyb206IHsgaWQ6IDUsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiA2LCBwb3J0OiAnbGV4JyB9IH0sXG4gICAgICAgIHsgZnJvbTogeyBpZDogNCwgcG9ydDogJ291dCcgfSwgdG86IHsgaWQ6IDUsIHBvcnQ6ICdhbGduJyB9IH0sXG4gICAgICAgIHsgZnJvbTogeyBpZDogNiwgcG9ydDogJ291dCcgfSwgdG86IHsgaWQ6IHVuZGVmaW5lZCwgcG9ydDogJ21vZGVsJyB9IH0sXG4gICAgICBdXG4gICAgfSxcbiAgICAnd29yZC1hbGlnbm1lbnQnOiB7XG4gICAgICB0eXBlOiAnd29yZC1hbGlnbm1lbnQnLCB0aXRsZTogJ1dvcmQgYWxpZ25tZW50JywgY2F0ZWdvcnk6ICdhbGlnbm1lbnQnLFxuICAgICAgcG9ydHM6IHsgaW46IFsnc3JjJywgJ3RyZyddLCBvdXQ6IFsnYWxnbiddIH0sXG4gICAgICBwcm9jZXNzZXM6IFtcbiAgICAgICAgeyBpZDogNjAxLCB0eXBlOiAnZmFzdGFsaWduJywgcGFyYW1zOiB7IHJldmVyc2U6IGZhbHNlIH0sIHg6IDIwLCB5OiA1MCwgd2lkdGg6IDE1MCwgaGVpZ2h0OiA1MCB9LFxuICAgICAgICB7IGlkOiA2MDIsIHR5cGU6ICdmYXN0YWxpZ24nLCBwYXJhbXM6IHsgcmV2ZXJzZTogdHJ1ZSB9LCB4OiAyMDAsIHk6IDUwLCB3aWR0aDogMTUwLCBoZWlnaHQ6IDUwIH0sXG4gICAgICAgIHsgaWQ6IDYwMywgdHlwZTogJ3N5bWFsaWduJywgcGFyYW1zOiB7IH0sIHg6IDEyMCwgeTogMjAwLCB3aWR0aDogMTUwLCBoZWlnaHQ6IDUwIH0sXG4gICAgICBdLFxuICAgICAgbGlua3M6IFtcbiAgICAgICAgeyBmcm9tOiB7IGlkOiB1bmRlZmluZWQsIHBvcnQ6ICdzcmMnIH0sIHRvOiB7IGlkOiA2MDEsIHBvcnQ6ICdzcmMnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiB1bmRlZmluZWQsIHBvcnQ6ICd0cmcnIH0sIHRvOiB7IGlkOiA2MDIsIHBvcnQ6ICd0cmcnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiB1bmRlZmluZWQsIHBvcnQ6ICdzcmMnIH0sIHRvOiB7IGlkOiA2MDIsIHBvcnQ6ICdzcmMnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiB1bmRlZmluZWQsIHBvcnQ6ICd0cmcnIH0sIHRvOiB7IGlkOiA2MDEsIHBvcnQ6ICd0cmcnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiA2MDEsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiA2MDMsIHBvcnQ6ICdzcmN0cmcnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiA2MDIsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiA2MDMsIHBvcnQ6ICd0cmdzcmMnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiA2MDMsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiB1bmRlZmluZWQsIHBvcnQ6ICdhbGduJyB9IH0sXG4gICAgICBdXG4gICAgfSxcbiAgICBldmFsdWF0aW9uOiB7XG4gICAgICB0aXRsZTogJ0V2YWx1YXRpb24nLCB0eXBlOiAnZXZhbHVhdGlvbicsIGNhdGVnb3J5OiAnZXZhbHVhdGlvbicsXG4gICAgICBwb3J0czogeyBpbjogWydzcmMnLCAncmVmJywgJ2luaSddLCBvdXQ6IFsndHJhbnMnLCAnYmxldSddIH0sXG4gICAgICBwcm9jZXNzZXM6IFtcbiAgICAgICAgeyBpZDogMiwgdHlwZTogJ3Rva2VuaXplcicsIHBhcmFtczogeyBsYW5nOiAnZW4nIH0sIHg6IDIwLCB5OiAxNzUsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAgfSxcbiAgICAgICAgeyBpZDogMywgdHlwZTogJ3Rva2VuaXplcicsIHBhcmFtczogeyBsYW5nOiAnbHYnIH0sIHg6IDIwMCwgeTogMTc1LCB3aWR0aDogMTUwLCBoZWlnaHQ6IDUwIH0sXG4gICAgICAgIHsgaWQ6IDQsIHR5cGU6ICdtb3NlcycsIHBhcmFtczoge30sIHg6IDUwLCB5OiA1MDAsIHdpZHRoOiAyNTAsIGhlaWdodDogNTAgfSxcbiAgICAgICAgeyBpZDogNSwgdHlwZTogJ2RldG9rZW5pemVyJywgcGFyYW1zOiB7IGxhbmc6ICdlbicgfSwgeDogMTUwLCB5OiA2NTAsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAgfSxcbiAgICAgICAgeyBpZDogNiwgdHlwZTogJ2JsZXUnLCBwYXJhbXM6IHsgY2FzZTogZmFsc2UgfSwgeDogMzUwLCB5OiA3NTAsIHdpZHRoOiAxNTAsIGhlaWdodDogNTAgfSxcbiAgICAgICAgeyBpZDogNywgdHlwZTogJ2NvbXBhcmV2YWwnLCBwYXJhbXM6IHtzZXJ2ZXI6J2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcsZXhwZXJpbWVudDondGVzdGluZyd9LCB4OiA1NTAsIHk6IDgwMCwgd2lkdGg6IDE1MCwgaGVpZ2h0OiA1MCB9LFxuICAgICAgXSxcbiAgICAgIGxpbmtzOiBbXG4gICAgICAgIHsgZnJvbTogeyBpZDogdW5kZWZpbmVkLCBwb3J0OiAnc3JjJyB9LCB0bzogeyBpZDogMiwgcG9ydDogJ2luJyB9IH0sXG4gICAgICAgIHsgZnJvbTogeyBpZDogdW5kZWZpbmVkLCBwb3J0OiAncmVmJyB9LCB0bzogeyBpZDogMywgcG9ydDogJ2luJyB9IH0sXG4gICAgICAgIHsgZnJvbTogeyBpZDogdW5kZWZpbmVkLCBwb3J0OiAnaW5pJyB9LCB0bzogeyBpZDogNCwgcG9ydDogJ2luaScgfSB9LFxuICAgICAgICB7IGZyb206IHsgaWQ6IDIsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiA0LCBwb3J0OiAnaW4nIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiA0LCBwb3J0OiAnb3V0JyB9LCB0bzogeyBpZDogNSwgcG9ydDogJ2luJyB9IH0sXG4gICAgICAgIHsgZnJvbTogeyBpZDogNCwgcG9ydDogJ291dCcgfSwgdG86IHsgaWQ6IDYsIHBvcnQ6ICd0cmFucycgfSB9LFxuICAgICAgICB7IGZyb206IHsgaWQ6IHVuZGVmaW5lZCwgcG9ydDogJ3NyYycgfSwgdG86IHsgaWQ6IDYsIHBvcnQ6ICdzcmMnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiB1bmRlZmluZWQsIHBvcnQ6ICdyZWYnIH0sIHRvOiB7IGlkOiA2LCBwb3J0OiAncmVmJyB9IH0sXG4gICAgICAgIHsgZnJvbTogeyBpZDogMiwgcG9ydDogJ291dCcgfSwgdG86IHsgaWQ6IDcsIHBvcnQ6ICdzcmMnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiAzLCBwb3J0OiAnb3V0JyB9LCB0bzogeyBpZDogNywgcG9ydDogJ3JlZicgfSB9LFxuICAgICAgICB7IGZyb206IHsgaWQ6IDUsIHBvcnQ6ICdvdXQnIH0sIHRvOiB7IGlkOiA3LCBwb3J0OiAndHJhbnMnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiA1LCBwb3J0OiAnb3V0JyB9LCB0bzogeyBpZDogdW5kZWZpbmVkLCBwb3J0OiAndHJhbnMnIH0gfSxcbiAgICAgICAgeyBmcm9tOiB7IGlkOiA2LCBwb3J0OiAnb3V0JyB9LCB0bzogeyBpZDogdW5kZWZpbmVkLCBwb3J0OiAnYmxldScgfSB9LFxuICAgICAgXVxuICAgIH0sXG4gICAgJ3BocmFzZS1leHRyYWN0aW9uJzoge1xuICAgICAgdHlwZTogJ3BocmFzZS1leHRyYWN0aW9uJywgdGl0bGU6ICdQaHJhc2UgZXh0cmFjdGlvbicsIGNhdGVnb3J5OiAncGhyYXNlcycsXG4gICAgICBcInByb2Nlc3Nlc1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImlkXCI6IDc3NyxcbiAgICAgICAgICBcIm5hbWVcIjogXCJwaHJhc2VzXCIsXG4gICAgICAgICAgXCJwYXJhbXNcIjoge1xuICAgICAgICAgICAgXCJtb2RlbFwiOiBcIndiZS1tc2RcIixcbiAgICAgICAgICAgIFwibWF4TGVuZ3RoXCI6IDdcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwieFwiOiA0NSxcbiAgICAgICAgICBcInlcIjogOTYsXG4gICAgICAgICAgXCJ3aWR0aFwiOiAxNTAsXG4gICAgICAgICAgXCJoZWlnaHRcIjogNTBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwiaWRcIjogMTA4OCxcbiAgICAgICAgICBcIm5hbWVcIjogXCJwaHJhc2VzY29yZVwiLFxuICAgICAgICAgIFwicGFyYW1zXCI6IHt9LFxuICAgICAgICAgIFwieFwiOiAyNyxcbiAgICAgICAgICBcInlcIjogMjQ2LFxuICAgICAgICAgIFwid2lkdGhcIjogMjUwLFxuICAgICAgICAgIFwiaGVpZ2h0XCI6IDUwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImlkXCI6IDE4ODIsXG4gICAgICAgICAgXCJuYW1lXCI6IFwicGhyYXNlc2JpblwiLFxuICAgICAgICAgIFwicGFyYW1zXCI6IHt9LFxuICAgICAgICAgIFwieFwiOiA2NCxcbiAgICAgICAgICBcInlcIjogNDE4LFxuICAgICAgICAgIFwid2lkdGhcIjogMTUwLFxuICAgICAgICAgIFwiaGVpZ2h0XCI6IDUwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImlkXCI6IDg4OCxcbiAgICAgICAgICBcIm5hbWVcIjogXCJyZW9yZGVyaW5nXCIsXG4gICAgICAgICAgXCJwYXJhbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwid2JlXCIsXG4gICAgICAgICAgICBcIm9yaWVudGF0aW9uXCI6IFwibXNkXCIsXG4gICAgICAgICAgICBcIm1vZGVsXCI6IFwid2JlLW1zZC1iaWRpcmVjdGlvbmFsLWZlXCIsXG4gICAgICAgICAgICBcInNtb290aGluZ1wiOiAwLjVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwieFwiOiAzNjgsXG4gICAgICAgICAgXCJ5XCI6IDE5OCxcbiAgICAgICAgICBcIndpZHRoXCI6IDE1MCxcbiAgICAgICAgICBcImhlaWdodFwiOiA1MCxcbiAgICAgICAgICBcInNlbGVjdGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImlkXCI6IDExODgsXG4gICAgICAgICAgXCJuYW1lXCI6IFwicmVvcmRlcmluZ2JpblwiLFxuICAgICAgICAgIFwicGFyYW1zXCI6IHt9LFxuICAgICAgICAgIFwieFwiOiAzNzMsXG4gICAgICAgICAgXCJ5XCI6IDMzNSxcbiAgICAgICAgICBcIndpZHRoXCI6IDE1MCxcbiAgICAgICAgICBcImhlaWdodFwiOiA1MFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJpZFwiOiA5ODgsXG4gICAgICAgICAgXCJuYW1lXCI6IFwibGV4aWNhbFwiLFxuICAgICAgICAgIFwicGFyYW1zXCI6IHt9LFxuICAgICAgICAgIFwieFwiOiAyNDIsXG4gICAgICAgICAgXCJ5XCI6IDY5LFxuICAgICAgICAgIFwid2lkdGhcIjogMTUwLFxuICAgICAgICAgIFwiaGVpZ2h0XCI6IDUwXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcImxpbmtzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwiZnJvbVwiOiB7XG4gICAgICAgICAgICBcImlkXCI6IDc3NyxcbiAgICAgICAgICAgIFwicG9ydFwiOiBcIm91dFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInRvXCI6IHtcbiAgICAgICAgICAgIFwiaWRcIjogMTA4OCxcbiAgICAgICAgICAgIFwicG9ydFwiOiBcInBoclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJmcm9tXCI6IHtcbiAgICAgICAgICAgIFwiaWRcIjogNzc3LFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwiaW52XCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidG9cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiAxMDg4LFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwicGhyaW52XCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImZyb21cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiA5ODgsXG4gICAgICAgICAgICBcInBvcnRcIjogXCJzcmN0cmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0b1wiOiB7XG4gICAgICAgICAgICBcImlkXCI6IDEwODgsXG4gICAgICAgICAgICBcInBvcnRcIjogXCJzcmN0cmdcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwiZnJvbVwiOiB7XG4gICAgICAgICAgICBcImlkXCI6IDc3NyxcbiAgICAgICAgICAgIFwicG9ydFwiOiBcIm9cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0b1wiOiB7XG4gICAgICAgICAgICBcImlkXCI6IDg4OCxcbiAgICAgICAgICAgIFwicG9ydFwiOiBcInBoclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJmcm9tXCI6IHtcbiAgICAgICAgICAgIFwiaWRcIjogOTg4LFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwidHJnc3JjXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidG9cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiAxMDg4LFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwidHJnc3JjXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImZyb21cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiA4ODgsXG4gICAgICAgICAgICBcInBvcnRcIjogXCJyZW9yZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInRvXCI6IHtcbiAgICAgICAgICAgIFwiaWRcIjogMTE4OCxcbiAgICAgICAgICAgIFwicG9ydFwiOiBcInJlb3JkXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImZyb21cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiAxMDg4LFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwicHRhYmxlXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidG9cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiAxODgyLFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwicHRhYmxlXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImZyb21cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiAxODgyLFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwibWlucGhyXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidG9cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBcInBvcnRcIjogXCJtaW5waHJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwiZnJvbVwiOiB7XG4gICAgICAgICAgICBcImlkXCI6IDExODgsXG4gICAgICAgICAgICBcInBvcnRcIjogXCJtaW5sZXhyXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidG9cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBcInBvcnRcIjogXCJtaW5sZXhyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImZyb21cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBcInBvcnRcIjogXCJzcmNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0b1wiOiB7XG4gICAgICAgICAgICBcImlkXCI6IDc3NyxcbiAgICAgICAgICAgIFwicG9ydFwiOiBcInNyY1wiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJmcm9tXCI6IHtcbiAgICAgICAgICAgIFwiaWRcIjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwidHJnXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidG9cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiA3NzcsXG4gICAgICAgICAgICBcInBvcnRcIjogXCJ0cmdcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwiZnJvbVwiOiB7XG4gICAgICAgICAgICBcImlkXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIFwicG9ydFwiOiBcInNyY1wiXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInRvXCI6IHtcbiAgICAgICAgICAgIFwiaWRcIjogOTg4LFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwic3JjXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImZyb21cIjoge1xuICAgICAgICAgICAgXCJpZFwiOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBcInBvcnRcIjogXCJ0cmdcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0b1wiOiB7XG4gICAgICAgICAgICBcImlkXCI6IDk4OCxcbiAgICAgICAgICAgIFwicG9ydFwiOiBcInRyZ1wiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJmcm9tXCI6IHtcbiAgICAgICAgICAgIFwiaWRcIjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwiYWxnblwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInRvXCI6IHtcbiAgICAgICAgICAgIFwiaWRcIjogOTg4LFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwiYWxnblwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJmcm9tXCI6IHtcbiAgICAgICAgICAgIFwiaWRcIjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwiYWxnblwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInRvXCI6IHtcbiAgICAgICAgICAgIFwiaWRcIjogNzc3LFxuICAgICAgICAgICAgXCJwb3J0XCI6IFwiYWxnblwiXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJwb3J0c1wiOiB7XG4gICAgICAgIFwiaW5cIjogW1xuICAgICAgICAgIFwic3JjXCIsXG4gICAgICAgICAgXCJ0cmdcIixcbiAgICAgICAgICBcImFsZ25cIlxuICAgICAgICBdLFxuICAgICAgICBcIm91dFwiOiBbXG4gICAgICAgICAgXCJtaW5waHJcIixcbiAgICAgICAgICBcIm1pbmxleHJcIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG52YXIgQ2F0ZWdvcnlUaXRsZXMgPSB7XG4gICdsbSc6ICdMYW5ndWFnZSBtb2RlbHMnLFxuICAnYWxpZ25tZW50JzogJ1dvcmQgYWxpZ25tZW50JyxcbiAgJ2RlY29kZXInOiAnRGVjb2RpbmcnLFxuICAnY29ycG9yYSc6ICdDb3Jwb3JhIHRvb2xzJyxcbiAgJ2V2YWx1YXRpb24nOiAnRXZhbHVhdGlvbicsXG4gICdwaHJhc2VzJzogJ1BocmFzZSBiYXNlZCB0b29scycsXG4gICd0dW5pbmcnOiAnVHVuaW5nJ1xufTtcbiIsInZhciBQcm9wZXJ0aWVzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuICBtaXhpbnM6IFtSZWZsdXguTGlzdGVuZXJNaXhpbl0sXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4geyBzZWxlY3RlZDogbnVsbCB9O1xuICB9LFxuXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmxpc3RlblRvKEFjdGlvbnMuc2VsZWN0LCB0aGlzLm9uU2VsZWN0KTtcbiAgfSxcblxuICBvblNlbGVjdDogZnVuY3Rpb24ob2JqKSB7XG4gICAgdGhpcy5zZXRTdGF0ZSh7IHNlbGVjdGVkOiBvYmogfSk7XG4gIH0sXG5cbiAgb25DaGFuZ2U6IGZ1bmN0aW9uKHByb2Nlc3MsIGtleSwgdmFsdWUpIHtcbiAgICB0aGlzLnN0YXRlLnNlbGVjdGVkLnBhcmFtc1trZXldID0gdmFsdWU7XG4gICAgdGhpcy5zZXRTdGF0ZSh0aGlzLnN0YXRlKTtcbiAgICBBY3Rpb25zLnBhcmFtQ2hhbmdlZChwcm9jZXNzLCBrZXksIHZhbHVlKTtcbiAgfSxcblxuICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBib2R5O1xuICAgIGlmICghdGhpcy5zdGF0ZS5zZWxlY3RlZCB8fCAhdGhpcy5zdGF0ZS5zZWxlY3RlZC5wYXJhbXMpIHtcbiAgICAgIGJvZHkgPSA8ZGl2Pk5vdGhpbmcgc2VsZWN0ZWQ8L2Rpdj47XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBwID0gdGhpcy5zdGF0ZS5zZWxlY3RlZDtcbiAgICAgIHZhciBjaGlsZHJlbiA9IE9iamVjdC5rZXlzKHAudGVtcGxhdGUucGFyYW1zKS5tYXAoa2V5ID0+IHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICA8dHIga2V5PXtrZXl9PlxuICAgICAgICAgIDx0aD57a2V5fTwvdGg+XG4gICAgICAgICAgPHRkPjxpbnB1dCB0eXBlPVwidGV4dFwiIHZhbHVlPXtwLnBhcmFtc1trZXldfSBvbkNoYW5nZT17KGUpID0+IHRoaXMub25DaGFuZ2UocCwga2V5LCBlLnRhcmdldC52YWx1ZSl9Lz48L3RkPlxuICAgICAgICAgIDwvdHI+XG4gICAgICAgIClcbiAgICAgIH0pO1xuICAgICAgYm9keSA9IDx0YWJsZT48dGJvZHk+e2NoaWxkcmVufTwvdGJvZHk+PC90YWJsZT47XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICA8ZGl2PlxuICAgICAgICA8aDI+UHJvcGVydGllczwvaDI+XG4gICAgICAgIHtib2R5fVxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxufSk7XG4iLCJ2YXIgVG9vbGJveCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcbiAgbWl4aW5zOiBbUmVhY3QuYWRkb25zLlB1cmVSZW5kZXJNaXhpbl0sXG4gIFxuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7IGRyYWdnaW5nOiBudWxsIH07XG4gIH0sXG5cbiAgZHJhZ1N0YXJ0OiBmdW5jdGlvbihlLCBvYmopIHtcbiAgICAvLyB0b2RvOiBzZXQgaW1hZ2VcbiAgICB0aGlzLnNldFN0YXRlKHsgZHJhZ2dpbmc6IG9iaiB9KTtcbiAgfSxcblxuICBkcmFnRW5kOiBmdW5jdGlvbihlKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUuZHJhZ2dpbmcpIHtcbiAgICAgIEFjdGlvbnMuYWRkKHRoaXMuc3RhdGUuZHJhZ2dpbmcsIGUucGFnZVgsIGUucGFnZVkpXG4gICAgICB0aGlzLnNldFN0YXRlKHsgZHJhZ2dpbmc6IG51bGwgfSk7XG4gICAgfVxuICB9LFxuXG4gIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFsbCA9IFtdO1xuICAgIGZvciAodmFyIGkgaW4gVG9vbHMucHJvY2Vzc2VzKSBhbGwucHVzaChUb29scy5wcm9jZXNzZXNbaV0pO1xuICAgIGZvciAodmFyIGkgaW4gVG9vbHMuZ3JvdXBzKSBhbGwucHVzaChUb29scy5ncm91cHNbaV0pO1xuXG4gICAgdmFyIGNoaWxkcmVuID0gYWxsXG4gICAgICAubWFwKHAgPT4gcC5jYXRlZ29yeSlcbiAgICAgIC5maWx0ZXIoKGcsIGksIGFycikgPT4gYXJyLmxhc3RJbmRleE9mKGcpID09PSBpKVxuICAgICAgLm1hcChjYXQgPT4gKFxuICAgICAgICA8ZGl2IGtleT17Y2F0fSBjbGFzc05hbWU9XCJ0b29sYm94LWdyb3VwXCI+XG4gICAgICAgICAgPGgzPntDYXRlZ29yeVRpdGxlc1tjYXRdIHx8IGNhdH08L2gzPlxuICAgICAgICAgIDx1bD5cbiAgICAgICAgICAgIHthbGwuZmlsdGVyKHAgPT4gcC5jYXRlZ29yeSA9PSBjYXQpLm1hcChwID0+IChcbiAgICAgICAgICAgICAgPGxpIGtleT17Y2F0ICsgJy8nICsgcC50eXBlfVxuICAgICAgICAgICAgICAgIGRyYWdnYWJsZT1cInRydWVcIlxuICAgICAgICAgICAgICAgIG9uRHJhZ1N0YXJ0PXsoZSkgPT4gdGhpcy5kcmFnU3RhcnQoZSwgcCl9XG4gICAgICAgICAgICAgICAgb25EcmFnRW5kPXt0aGlzLmRyYWdFbmR9PlxuICAgICAgICAgICAgICAgIHtwLnRpdGxlIHx8IHAudHlwZX1cbiAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvdWw+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgPGRpdj5cbiAgICAgICAgPGgyPlRvb2xib3g8L2gyPlxuICAgICAgICB7Y2hpbGRyZW59XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9XG59KTtcbiIsInZhciBWYXJpYWJsZXMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XHJcbiAgLy9taXhpbnM6IFtSZWFjdC5hZGRvbnMuUHVyZVJlbmRlck1peGluXSxcclxuXHJcbiAgb25DaGFuZ2U6IChrZXksIHZhbHVlKSA9PiB7XHJcbiAgICBBY3Rpb25zLnZhcmlhYmxlQ2hhbmdlZChrZXksIHZhbHVlKTtcclxuICB9LFxyXG5cclxuICBvbkFkZDogZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLm9uQ2hhbmdlKHRoaXMucmVmcy5rZXkudmFsdWUsIHRoaXMucmVmcy52YWx1ZS52YWx1ZSk7XHJcbiAgICB0aGlzLnJlZnMua2V5LnZhbHVlID0gdGhpcy5yZWZzLnZhbHVlLnZhbHVlID0gJyc7XHJcbiAgfSxcclxuXHJcbiAgb25FbnRlcjogZnVuY3Rpb24oZSkge1xyXG4gICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xyXG4gICAgICB0aGlzLm9uQWRkKCk7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcclxuICAgIHZhciBjaGlsZHJlbiA9IE9iamVjdC5rZXlzKHRoaXMucHJvcHMudmFycylcclxuICAgICAgLm1hcChrZXkgPT4gKFxyXG4gICAgICAgIDx0ciBrZXk9e2tleX0+XHJcbiAgICAgICAgPHRoPntrZXl9PC90aD5cclxuICAgICAgICA8dGQ+PGlucHV0IHR5cGU9XCJ0ZXh0XCIgdmFsdWU9e3RoaXMucHJvcHMudmFyc1trZXldfSBvbkNoYW5nZT17KGUpID0+IHRoaXMub25DaGFuZ2Uoa2V5LCBlLnRhcmdldC52YWx1ZSl9Lz48L3RkPlxyXG4gICAgICAgIDwvdHI+XHJcbiAgICAgICkpO1xyXG5cclxuICAgIHJldHVybiAoXHJcbiAgICAgIDxkaXY+XHJcbiAgICAgICAgPGgyPlZhcmlhYmxlczwvaDI+XHJcbiAgICAgICAgPHRhYmxlPlxyXG4gICAgICAgIDx0Ym9keT5cclxuICAgICAgICAgIHtjaGlsZHJlbn1cclxuICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgPHRoPjxpbnB1dCB0eXBlPVwidGV4dFwiIHJlZj1cImtleVwiIG9uS2V5VXA9e3RoaXMub25FbnRlcn0gLz48L3RoPlxyXG4gICAgICAgICAgICA8dGQ+PGlucHV0IHR5cGU9XCJ0ZXh0XCIgcmVmPVwidmFsdWVcIiBvbktleVVwPXt0aGlzLm9uRW50ZXJ9Lz48L3RkPlxyXG4gICAgICAgICAgPC90cj5cclxuICAgICAgICA8L3Rib2R5PlxyXG4gICAgICAgIDwvdGFibGU+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgKTtcclxuICB9XHJcbn0pO1xyXG4iXX0=