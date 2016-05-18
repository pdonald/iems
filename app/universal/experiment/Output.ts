import GroupModel from './GroupModel';
import ProcessModel from './ProcessModel';

import { JobSpec } from '../grid/JobSpec';

interface Job {
  name: string;
  cmd: string;
  process: ProcessModel;
  input: { [key: string]: string };
  output: { [key: string]: string };
}

function joblist(graph: GroupModel): Job[] {
  return graph.getAllProcesses().map(p => {
    var input: { [key: string]: string } = {};
    var output: { [key: string]: string } = {};

    p.getInputs().forEach(i => input[i.toPort] = i.process.getMakefileKey(i.port));
    p.getPorts().output.forEach(key => output[key] = p.getMakefileKey(key));
    
    return {
      name: p.getTitle(),
      cmd: p.template.toBash(p.getParamValues(), input, output).join('\n'),
      process: p,
      input: input,
      output: output
    };
  });
}

var Output = {
  Nothing: () => '',

  JSON: (graph, depth?: number): string => {
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
    var pad = ''; for (var i = 0; i < depth + (1*depth) + 1; i++) pad += '  ';
    var pad1 = ''; for (var i = 0; i < depth + (1*depth); i++) pad1 += '  ';
    var pad2 = ''; for (var i = 0; i < depth + (1*depth) + 2; i++) pad2 += '  ';

    // group data
    var json = pad1 + '{' + '\n';
    json += pad + `id: ${graph.id}, title: '${graph.title.replace("'", "\\'")}', `
                + `type: '${graph.type}', category: '${graph.category}',` + '\n';
    json += pad + `x: ${graph.x}, y: ${graph.y}, collapsed: ${graph.collapsed ? true : false},` + '\n';
    if (graph.ports) json += pad + `ports: { input: ['${graph.ports.input.join("', '")}'], output: ['${graph.ports.output.join("', '")}'] },` + '\n';

    // processes data
    if (graph.processes.length > 0) {
      json += pad + 'processes: [' + '\n';
      json += graph.processes
        .map(p => `{ id: ${p.id}, x: ${p.x}, y: ${p.y}, type: '${p.type}', params: { ${params2str(p.params)} } }`)
        .map(s => pad2 + s).join(',\n') + '\n';
      json += pad + ']';
    } else {
      json += pad + 'processes: []';
    }

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

  Makefile: (graph: GroupModel): string => {
    function escapecmd(cmd: string): string {
      // i know, i know
      return cmd.replace(/\$/g, '$$$' /* we want $$ */).replace(/\$\(/g, '$(shell ')
    }
    
    let jobs = joblist(graph);
    
    let alloutputs: string[] = [];
    for (let job of jobs) {
      alloutputs = alloutputs.concat(Object.keys(job.output).map(k => job.output[k]));
      if (Object.keys(job.output).length == 0) {
        alloutputs.push(job.process.getMakefileKey('done'));
      }
    }
    alloutputs = alloutputs.filter((e, i, arr) => arr.lastIndexOf(e) === i);
    
    let text =
        '.PHONY: all clean\n\n' +
        'all: ' + alloutputs.join(' ') + '\n\n' +
        'clean:\n\trm -rf status.* ' + alloutputs.join(' ') + '\n\n';
    
    for (let job of jobs) {
      let noOutput = Object.keys(job.output).length === 0;
      text += noOutput || Object.keys(job.output).map(k => job.output[k]).join(' ');
      text += ': '
      text += Object.keys(job.input).map(k => job.input[k]).join(' ')
      text += '\n'
      text += '\t' + `touch status.${job.process.getMakefileKey('running')}` + '\n';
      text += '\t' + escapecmd(job.process.template.toBash(job.process.getParamValues(), job.input, job.output).join('\n\t')) + '\n';
      if (noOutput) text += '\ttouch ' + noOutput + '\n';
      text += '\t' + `mv status.${job.process.getMakefileKey('running')} status.${job.process.getMakefileKey('done')}` + '\n';
      text += '\n'
    }

    return text;
  },
  
  JobSpec: (graph: GroupModel): string => {
    let jobs = joblist(graph);
        
    let formatted: JobSpec[] = jobs.map(j => {
      return {
        id: j.process.getFullId(),
        name: j.name,
        cmd: j.cmd,
        dependencies: [graph.doc.id, ...jobs.filter(jj => j.process.dependsOn(jj.process)).map(jj => jj.process.getFullId())],
        //input: Object.keys(j.input).map(k => j.input[k]),
        //output: Object.keys(j.output).map(k => j.output[k]),
      }
    });
    
    formatted.unshift({
      id: graph.doc.id,
      name: graph.doc.name || graph.doc.props.name,
      cmd: 'echo Lets go',
      dependencies: []
    });
    
    return JSON.stringify(formatted, null, 2);
  }
};

export default Output;
