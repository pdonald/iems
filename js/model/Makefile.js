function genMakefile(graph, data, ischild, all) {

  //return JSON.stringify(graph, null, 2)

  function makeData(graph) {
    data.ids[graph.id] = graph
    if (graph.processes) graph.processes.forEach(p => data.ids[p.id] = p)
    if (graph.links) data.links = data.links.concat(graph.links)
    if (graph.groups) graph.groups.forEach(g => makeData(g))
  }

  function resolve(id, port) {
    if (data.ids[id].processes || data.ids[id].groups) {
      // go up
      // find links to this
      var link = data.links.filter(l => l.to.id == id && l.to.port == port)[0]
      if (!link) return null;
      return resolve(link.from.id, link.from.port);
    } else {
      return { graph: data.ids[id], port: port };
    }
  }

  if (!data) {
    data = {
      ids: {},
      links: []
    }
    makeData(graph)
  }

  var text = '';
  if (!ischild) all = [];

  if (graph.processes) {
    graph.processes.forEach(p => {
      var tpl = processes[p.name];
      if (!tpl) return;

      var output = {};
      Object.keys(tpl.output).map(key => output[key] = tpl.name + p.id + '.' + key);

      var input = {};
      data.links.filter(l => l.to.id == p.id).forEach(l => {
        var x = resolve(l.from.id, l.from.port)
        if (x) input[l.to.port] = x.graph.name + x.graph.id + '.' + x.port
      });

      Object.keys(output).forEach(key => all.push(output[key]));
      var noOutputDone = p.name + p.id + '.done';

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
      text += genMakefile(g, data, true, all) + '\n'
    })
  }

  if (!ischild) {
    text =
      '.PHONY: all clean\n\n' +
      'all: ' + all.join(' ') + '\n\n' +
      'clean:\n\trm -f ' + all.join(' ') + '\n\n' +
      text;
  }

  //if (!graph.id) console.log(text)
  return text;
}
