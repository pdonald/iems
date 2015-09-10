function genMakefile(graph, ischild, all) {

  function processName(p, group, port) {
    return p.name + '-g' + group.id + 'p' + p.id + '.' + port;
  }

  function groupName(group, port) {
    return group.name + '-g' + group.id + '.' + port;
  }

  var text = '';
  if (!ischild) all = [];

  if (graph.processes) {
    graph.processes.forEach(p => {
      var tpl = Tools.processes[p.name];
      if (!tpl) return;

      var output = {};
      Object.keys(tpl.output).map(key => output[key] = processName(p, graph, key));

      var input = {};
      graph.links.filter(l => l.to.id == p.id).forEach(l => {
        if (l.from.id == graph.id) {
          input[l.to.port] = groupName(graph, l.from.port);
        } else {
          var x = graph.processes.filter(pp => pp.id == l.from.id)[0];
          if (x) input[l.to.port] = processName(x, graph, l.from.port);
        }
      });

      Object.keys(output).forEach(key => all.push(output[key]));
      var noOutputDone = p.name + p.id + '.done'; // todo

      if (Object.keys(output).length == 0) all.push(noOutputDone)
      if (Object.keys(output).length == 0) text += noOutputDone;
      text += Object.keys(output).map(key => output[key]).join(' ')
      text += ': '
      text += Object.keys(input).map(key => input[key]).join(' ')
      text += '\n'
      text += '\t' + tpl.toBash(p.params || {}, input, output).join('\n\t') + '\n';
      if (Object.keys(output).length == 0) text += '\ttouch ' + noOutputDone + '\n';
      text += '\n'
    });
  }

  if (graph.groups) {
    graph.groups.forEach(g => {
      g.ports.in.forEach(port => {
        var link = graph.links.filter(l => l.to.id == g.id)[0];
        if (link) {
          var process = graph.processes.filter(p => p.id == link.from.id)[0];
          if (process) {
            text += groupName(g, port) + ': ' + processName(process, graph, link.from.port) + '\n';
            text += '\tln -f -s $< $@' + '\n';
            text += '\n';
            all.push(groupName(g, port));
            return;
          }
          var group = graph.groups.filter(p => p.id == link.from.id)[0];
          if (group) {
            text += groupName(g, port) + ': ' + groupName(group, link.from.port) + '\n';
            text += '\tln -f -s $< $@' + '\n';
            text += '\n';
            all.push(groupName(g, port));
            return;
          }
        }
      });
      g.ports.out.forEach(port => {
        var link = g.links.filter(l => l.to.id == g.id)[0];
        if (link) {
          var process = g.processes.filter(p => p.id == link.from.id)[0];
          if (process) {
            text += groupName(g, port) + ': ' + processName(process, g, link.from.port) + '\n';
            text += '\tln -f -s $< $@' + '\n';
            text += '\n';
            all.push(groupName(g, port));
            return;
          }
          var group = g.groups.filter(p => p.id == link.from.id)[0];
          if (group) {
            text += groupName(g, port) + ': ' + groupName(group, link.from.port) + '\n';
            text += '\tln -f -s $< $@' + '\n';
            text += '\n';
            all.push(groupName(g, port));
            return;
          }
        }
      });
    });
    graph.groups.forEach(g => {
      text += genMakefile(g, true, all) + '\n'
    });
  }

  if (!ischild) {
    text =
      '.PHONY: all clean\n\n' +
      'all: ' + all.join(' ') + '\n\n' +
      'clean:\n\trm -f ' + all.join(' ') + '\n\n' +
      text;
  }

  return text;
}
