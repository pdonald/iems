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
  },
  scorePhrases: {
    name: 'score-phrases',
    params: { },
    input: { phr: 'file<phrases>', phrI: 'file<inv-phrases>', f2e: 'file<lex-f2e>', e2f: 'file<lex-e2f>' },
    output: { pTable: 'file<phrase-table>' },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp -d) && \\',
        `/tools/score ${input.phr} ${input.f2e} phrase-table.half.e2f.gz  0 && \\`,
        `/tools/score ${input.phrI} ${input.e2f} phrase-table.half.f2e.gz  --Inverse 1 && \\`,
        `/tools/consolidate phrase-table.half.e2f.gz phrase-table.half.f2e.gz /dev/stdout | gzip -c > ${output.pTable} && \\`,
        `rm -f phrase-table.half.* && \\`,
        `mv $$TEMP/extract ${output.half} && \\`, 		//is this needed?
        `mv $$TEMP/extract.inv ${output.halfI} && \\`, 	//is this needed?
        'rm -r $$TEMP'
      ];
    }
  },
  reorderingModel: {
    name: 'reordering-model',
    params: { },
    input: { exOs: 'file<phrase-table>' },				//extract.o.sorted.gz ???
    output: { rTable: 'file<reordering-table>' },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp -d) && \\',
        `/tools/lexical-reordering-score ${input.exOs} 0.5 ${output.rTable}. --model "wbe msd wbe-msd-bidirectional-fe" && \\`,
        `mv $$TEMP/extract ${output.half} && \\`, 		//is this needed?
        `mv $$TEMP/extract.inv ${output.halfI} && \\`, 	//is this needed?
        'rm -r $$TEMP'
      ];
    }
  }
};
