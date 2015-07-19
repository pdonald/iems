function genMakefile(graph, data) {

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

      text += Object.keys(output).map(key => output[key]).join(' ')
      text += ': '
      text += Object.keys(input).map(key => input[key]).join(' ')
      text += '\n'
      text += '  ' + tpl.toBash(p.params || {}, input, output).join('\n  ') + '\n\n'
    });
  }

  if (graph.groups) {
    graph.groups.forEach(g => {
      text += genMakefile(g, data) + '\n'
    })
  }

  //if (!graph.id) console.log(text)
  return text;
}
