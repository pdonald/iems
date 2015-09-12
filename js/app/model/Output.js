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
    if (!depth) depth = 0;
    var pad = ''; for (var i = 0; i < depth + (1*depth) + 1; i++) pad += '  ';
    var pad1 = ''; for (var i = 0; i < depth + (1*depth); i++) pad1 += '  ';
    var pad2 = ''; for (var i = 0; i < depth + (1*depth) + 2; i++) pad2 += '  ';

    // group data
    var json = pad1 + '{' + '\n';
    json += pad + `id: ${graph.id}, title: '${graph.title.replace("'", "\\'")}', `
                + `type: '${graph.type}', category: '${graph.category}',` + '\n';
    json += pad + `x: ${graph.x}, y: ${graph.y}, collapsed: ${graph.collapsed?true:false},` + '\n';
    if (graph.ports) json += pad + `ports: { in: ['${graph.ports.in.join("', '")}'], out: ['${graph.ports.out.join("', '")}'] },` + '\n';

    // processes data
    json += pad + 'processes: [' + '\n';
    json += graph.processes
      .map(p => `{ id: ${p.id}, x: ${p.x}, y: ${p.y}, width: ${p.width}, height: ${p.height}, type: '${p.type}', params: {} }`)
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

  Makefile: (graph, all) => {
    function processName(p, port) {
      return p.type + '-g' + p.group.id + 'p' + p.id + (port ? '.' + port : '');
    }

    var text = '';

    var root = !all;
    if (root) all = [];

    graph.processes.forEach(p => {
      var input = {};
      var output = {};
      var noOutput = null;

      Object.keys(p.template.output).forEach(key => {
        output[key] = processName(p, key);
        all.push(output[key]);
      });

      if (Object.keys(output).length == 0) {
        noOutput = processName(p, 'done');
        all.push(noOutput);
      }

      graph.links.filter(l => l.to.id == p.id).forEach(l => {
        var result = graph.resolveLinkInput(l);
        if (result) {
          input[l.to.port] = processName(result.process, result.port);
        }
      });

      text += noOutput || Object.keys(output).map(key => output[key]).join(' ');
      text += ': '
      text += Object.keys(input).map(key => input[key]).join(' ')
      text += '\n'
      text += '\t' + `touch status.${processName(p, 'running')}` + '\n';
      text += '\t' + p.template.toBash(resolveParams(p.params, p.group.doc.vars), input, output).join('\n\t') + '\n';
      if (noOutput) text += '\ttouch ' + noOutput + '\n';
      text += '\t' + `mv status.${processName(p, 'running')} status.${processName(p, 'done')}` + '\n';
      text += '\n'
    });

    graph.groups.forEach(g => text += Output.Makefile(g, all) + '\n');

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
