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
