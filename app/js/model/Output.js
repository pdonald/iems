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

var Output = {
  Nothing: () => '',

  JSON: (graph, depth) => {
    function params2str(params) {
      var arr = [];
      for (var key in params) {
        if (params[key]) {
          arr.push(key + ': "' + params[key].replace('"', '\\"') + '"');
        }
      }
      return arr.join(', ');
    }

    if (!depth) depth = 0;
    var pad = ''; for (var i = 0; i < depth + (1*depth) + 1; i++) pad += '  ';
    var pad1 = ''; for (var i = 0; i < depth + (1*depth); i++) pad1 += '  ';
    var pad2 = ''; for (var i = 0; i < depth + (1*depth) + 2; i++) pad2 += '  ';

    // group data
    var json = pad1 + '{' + '\n';
    json += pad + `id: ${graph.id}, title: '${graph.title.replace("'", "\\'")}', `
                + `type: '${graph.type}', category: '${graph.category}',` + '\n';
    json += pad + `x: ${graph.x}, y: ${graph.y}, collapsed: ${graph.collapsed ? true : false},` + '\n';
    if (graph.ports) json += pad + `ports: { in: ['${graph.ports.in.join("', '")}'], out: ['${graph.ports.out.join("', '")}'] },` + '\n';

    // processes data
    json += pad + 'processes: [' + '\n';
    json += graph.processes
      .map(p => `{ id: ${p.id}, x: ${p.x}, y: ${p.y}, width: ${p.width}, height: ${p.height}, type: '${p.type}', params: { ${params2str(p.params)} } }`)
      .map(s => pad2 + s).join(',\n') + '\n';
    json += pad + ']';

    // links data
    if (graph.links.length) {
      json += ',' + '\n';
      json += pad + 'links: [' + '\n';
      json += graph.links
        .map(l => `{ from: { id: ${l.from.id}, port: '${l.from.port}' }, to: { id: ${l.to.id}, port: '${l.to.port}' } }`)
        .map(s => pad2 + s).join(',\n') + '\n';
      json += pad + ']';
    }

    if (graph.groups.length) {
      json += ',' + '\n';
      json += pad + 'groups: [' + '\n';
      json += graph.groups.map(g => Output.JSON(g, depth + 1)).join(',\n') + '\n';
      json += pad + ']';
    }

    json += '\n';
    json += pad1 + '}';

    if (depth == 0) json += '\n';

    return json;
  },

  Makefile: (graph, all, cache) => {
    var text = '';

    var root = !all;
    if (root) all = [];

    graph.processes.forEach(p => {
      var input = {};
      var output = {};
      var noOutput = null;

      Object.keys(p.template.output).forEach(key => {
        output[key] = p.getMakefileKey(key);
        all.push(output[key]);
      });

      if (Object.keys(output).length == 0) {
        noOutput = p.getMakefileKey( 'done');
        all.push(noOutput);
      }

      graph.links.filter(l => l.to.id == p.id).forEach(l => {
        var result = graph.resolveLinkInput(l);
        if (result) {
          input[l.to.port] = result.process.getMakefileKey(result.port);
        }
      });

      text += noOutput || Object.keys(output).map(key => output[key]).join(' ');
      text += ': '
      text += Object.keys(input).map(key => input[key]).join(' ')
      text += '\n'
      text += '\t' + `touch status.${p.getMakefileKey('running')}` + '\n';
      text += '\t' + p.template.toBash(resolveParams(p.params, p.group.doc.vars), input, output).join('\n\t') + '\n';
      if (noOutput) text += '\ttouch ' + noOutput + '\n';
      text += '\t' + `mv status.${p.getMakefileKey('running')} status.${p.getMakefileKey('done')}` + '\n';
      text += '\n'
    });

    graph.groups.forEach(g => text += Output.Makefile(g, all, cache) + '\n');

    if (root) {
      text =
        '.PHONY: all clean\n\n' +
        'all: ' + all.join(' ') + '\n\n' +
        'clean:\n\trm -rf status.* ' + all.join(' ') + '\n\n' +
        text;
    }

    return text;
  }
};