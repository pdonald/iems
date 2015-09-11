function genMakefile(graph, root, all) {

  function processName(p, group, port) {
    return p.name + '-g' + group.id + 'p' + p.id + '.' + port;
  }

  var gen = !all;
  var text = '';
  if (gen) all = [];

  if (graph.processes) {
    graph.processes.forEach(p => {
      var tpl = Tools.processes[p.name];
      if (!tpl) return;

      var output = {};
      Object.keys(tpl.output).map(key => output[key] = processName(p, graph, key));
      var noOutputDone = p.name + '-g' + graph.id + 'p' + p.id + '.done';

      var input = {};
      graph.links.filter(l => l.to.id == p.id).forEach(l => {
        if (l.from.id == graph.id) {
          var x = root.getLinkToGroup(l.from.id, l.from.port);
          if (x) input[l.to.port] = processName(x.p, x.g, x.port);
        } else {
          var x = graph.processes.filter(pp => pp.id == l.from.id)[0];
          if (x) input[l.to.port] = processName(x, graph, l.from.port);
          else {
            x = root.getLinkToGroup(l.from.id, l.from.port);
            if (x) input[l.to.port] = processName(x.p, x.g, x.port);
          }
        }
      });

      Object.keys(output).forEach(key => all.push(output[key]));

      if (Object.keys(output).length == 0) {
        all.push(noOutputDone);
        text += noOutputDone;
      } else {
        text += Object.keys(output).map(key => output[key]).join(' ')
      }
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
      text += genMakefile(g, root, all) + '\n'
    });
  }

  if (gen) {
    text =
      '.PHONY: all clean\n\n' +
      'all: ' + all.join(' ') + '\n\n' +
      'clean:\n\trm -rf ' + all.join(' ') + '\n\n' +
      text;
  }

  return text;
}
