class GroupX {
  constructor(obj) {
    this.groups = [];
    this.processes = [];
    this.links = [];

    for (var key in obj) {
      this[key] = obj[key];
    }

    if (this.groups) {
      this.groups.forEach((g, index) => {
        this.groups[index] = new GroupX(g);
      });
    }
  }

  getSize() {
    if (this.width && this.height) {
      return { width: this.width, height: this.height };
    }
    var size = { width: this.x, height: this.y };
    var padding = 50;
    this.groups.forEach(g => {
      var groupSize = g.getSize();
      if (g.x + groupSize.width + padding > size.width) size.width = g.x + groupSize.width + padding;
      if (g.y + groupSize.height + padding > size.height) size.height = g.y + groupSize.height + padding;
    });
    this.processes.forEach(p => {
      if (p.x + p.width + padding > size.width) size.width = p.x + p.width + padding;
      if (p.y + p.height + padding > size.height) size.height = p.y + p.height + padding;
    });
    return size;
  }

  deleteSelected() {
    this.groups.filter(g => g.selected).slice().forEach(g => this.deleteGroup(g));
    this.processes.filter(p => p.selected).slice().forEach(p => this.deleteProcess(p));
    this.links.filter(l => l.selected).slice().forEach(l => this.deleteLink(l));
    this.groups.forEach(g => g.deleteSelected());
  }

  deleteGroup(group) {
    this.groups.splice(this.groups.indexOf(group), 1);
    this.links.slice().forEach(l => {
      if (l.from.id == group.id || l.to.id == group.id) {
        this.deleteLink(l);
      }
    });
  }

  deleteProcess(process) {
    this.processes.splice(this.processes.indexOf(process), 1);
    this.links.slice().forEach(l => {
      if (l.from.id == process.id || l.to.id == process.id) {
        this.deleteLink(l);
      }
    });
  }

  deleteLink(link) {
    this.links.splice(this.links.indexOf(link), 1);
  }
}

var processes = {
  bible: {
    name: 'bible',
    params: { lang: 'string' },
    input: { },
    output: { out: 'file<sent>' },
    toBash: (params, input, output) => {
      return [`cp /data/bible.${params.lang} ${output.out}`];
    }
  },
  wget: {
    name: 'wget',
    params: { url: 'string' },
    input: { },
    output: { out: 'file<any>', stats: 'file<text>' },
    toBash: (params, input, output) => {
      return [`wget ${params.url} -o ${output.out}`];
    }
  },
  tokenizer: {
    name: 'tokenizer',
    params: { lang: 'string' },
    input: { in: 'file<text>' },
    output: { out: 'file<tok>' },
    toBash: (params, input, output) => {
      return [`perl /tools/tokenizer.perl -l ${params.lang} < ${input.in} > ${output.out}`];
    }
  },
  fastalign: {
    name: 'fastalign',
    params: { reverse: 'bool' },
    input: { src: 'file<tok>', trg: 'file<tok>' },
    output: { out: 'file<align>' },
    toBash: (params, input, output) => {
      var temp = `${output.out}.temp`
      var cmd = [];
      cmd.push(`python /tools/join.py -f ${input.src} -f ${input.trg} -d ' ||| ' > ${temp}`);
      cmd.push(`/tools/fast_align ${params.reverse ? '-r' : ''} -i ${temp} > ${output.out}`);
      cmd.push(`rm ${temp}`);
      return cmd;
    }
  },
  kenlm: {
    name: 'kenlm',
    params: { order: 'integer' },
    input: { in: 'file<tok>' },
    output: { out: 'file<arpa>' },
    toBash: (params, input, output) => {
      return [`/tools/lmplz -o ${params.order} < ${input.in} > ${output.out}`];
    }
  },
  sym: {
    name: 'sym',
    params: { method: 'string' },
    input: { srctrg: 'file<align>', trgsrc: 'file<align>' },
    output: { out: 'file<align>' },
    toBash: (params, input, output) => {
      return [`/tools/sym -alg ${params.method} -i ${input.srctrg} -i ${input.trgsrc} > ${output.out}`];
    }
  },
  phrases: {
    name: 'phrases',
    params: {},
    input: { alignments: 'file<align>', src: 'file<tok>', trg: 'file<tok>' },
    output: { out: 'file<phrases>' },
    toBash: (params, input, output) => {
      return [`/tools/extract_phrases -s ${input.src} -t ${input.src} -a ${input.alignments} > ${output.out}`];
    },
    wordalign: {

    }
  }
};

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
