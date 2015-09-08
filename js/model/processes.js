var processes = {
  wget: {
    name: 'wget',
    params: { url: 'string' },
    input: { },
    output: { out: 'file<any>' },
    toBash: (params, input, output) => {
      return [`wget ${params.url} -O ${output.out}`];
    }
  },
  opus: {
    name: 'opus',
    params: { corpus: 'string', srcLang: 'language', trgLang: 'language' },
    input: { },
    output: { src: 'file<text>', trg: 'file<text>' },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp) && \\',
        `wget http://opus.lingfil.uu.se/${params.corpus}/${params.srcLang}-${params.trgLang}.txt.zip -O $$TEMP && \\`,
        `unzip -p $$TEMP ${params.corpus}.${params.srcLang}-${params.trgLang}.${params.srcLang} > ${output.src} && \\`,
        `unzip -p $$TEMP ${params.corpus}.${params.srcLang}-${params.trgLang}.${params.trgLang} > ${output.trg} && \\`,
        'rm $$TEMP'
      ];
    }
  },
  tokenizer: {
    name: 'tokenizer',
    params: { lang: 'string' },
    input: { in: 'file<text>' },
    output: { out: 'file<tok>' },
    toBash: (params, input, output) => {
      return [`perl /tools/scripts/tokenizer/tokenizer.perl -l ${params.lang} < ${input.in} > ${output.out}`];
    }
  },
  fastalign: {
    name: 'fastalign',
    params: { reverse: 'bool' },
    input: { src: 'file<tok>', trg: 'file<tok>' },
    output: { out: 'file<align>' },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp) && \\',
        `python /tools/join.py ${input.src} ${input.trg} > $$TEMP && \\`,
        `/tools/fast_align ${params.reverse ? '-r' : ''} -i $$TEMP > ${output.out} && \\`,
        'rm $$TEMP'
      ]
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
  binlm: {
    name: 'binlm',
    params: { type: 'string' },
    input: { in: 'file<arpa>' },
    output: { out: 'file<binlm>' },
    toBash: (params, input, output) => {
      return [`/tools/build_binary ${params.type} ${input.in} ${output.out}`];
    }
  },
  sym: {
    name: 'sym',
    params: { method: 'string' },
    input: { srctrg: 'file<align>', trgsrc: 'file<align>' },
    output: { out: 'file<align>' },
    toBash: (params, input, output) => {
      return [`/tools/atools -c ${params.method} -i ${input.srctrg} -j ${input.trgsrc} > ${output.out}`];
    }
  },
  phrases: {
    name: 'phrases',
    params: { maxLength: 'int', model: 'string' },
    input: { alignments: 'file<align>', src: 'file<tok>', trg: 'file<tok>' },
    output: { out: 'file<phrases>', inv: 'file<phrases>' },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp -d) && \\',
        `/tools/extract ${input.trg} ${input.src} ${input.alignments} $$TEMP/extract ${params.maxLength} orientation --model ${params.model} && \\`,
        `mv $$TEMP/extract ${output.out} && \\`,
        `mv $$TEMP/extract.inv ${output.inv} && \\`,
        'rm -r $$TEMP'
      ];
    }
  }
};
