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
    input: { algn: 'file<align>', src: 'file<tok>', trg: 'file<tok>' },
    output: { out: 'file<phrases>', inv: 'file<phrases>', o: 'file<any>' },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp -d) && \\',
        `/tools/extract ${input.trg} ${input.src} ${input.algn} $$TEMP/extract ${params.maxLength} orientation --model ${params.model} && \\`,
        `LC_ALL=C sort $$TEMP/extract -T $$TEMP > ${output.out} && \\`,
        `LC_ALL=C sort $$TEMP/extract.inv -T $$TEMP > ${output.inv} && \\`,
        `LC_ALL=C sort $$TEMP/extract.o -T $$TEMP > ${output.o} && \\`,
        'rm -r $$TEMP'
      ];
    }
  },
  lexical: {
    name: 'lexical',
    params: {},
    input: { algn: 'file<align>', src: 'file<tok>', trg: 'file<tok>' },
    output: { srctrg: 'file<lex>', trgsrc: 'file<lex>' },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp -d) && \\',
        `perl /tools/scripts/training/get-lexical.perl ${input.src} ${input.trg} ${input.algn} $$TEMP/lex && \\`,
        `mv $$TEMP/lex.e2f ${output.srctrg} && \\`,
        `mv $$TEMP/lex.f2e ${output.trgsrc} && \\`,
        'rm -r $$TEMP'
      ];
    }
  },
  phrasescore: {
    name: 'phrasescore',
    params: { },
    input: { phr: 'file<phrases>', phrinv: 'file<phrases>', srctrg: 'file<lex>', trgsrc: 'file<lex>' },
    output: { ptable: 'file<phrase-table>' },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp -d) && \\',
        `/tools/score ${input.phr} ${input.trgsrc} /dev/stdout > $$TEMP/trgsrc && \\`,
        `/tools/score ${input.phrinv} ${input.srctrg} /dev/stdout --Inverse > $$TEMP/srctrg && \\`,
        `LC_ALL=C sort $$TEMP/srctrg -T $$TEMP | gzip > $$TEMP/srctrg.sorted.gz && \\`,
        `LC_ALL=C sort $$TEMP/trgsrc -T $$TEMP | gzip > $$TEMP/trgsrc.sorted.gz && \\`,
        `/tools/consolidate $$TEMP/trgsrc.sorted.gz $$TEMP/srctrg.sorted.gz ${output.ptable} && \\`,
        'rm -r $$TEMP'
      ];
    }
  },
  phrasesbin: {
    name: 'binarize-phrases',
    input: { ptable: 'file<phrase-table>' },
    output: { bin: 'file<phrase-table-bin>' },
    toBash: (params, input, output) => {
      return [
        `/tools/processPhraseTableMin -nscores 4 -threads 1 -in ${input.ptable} -out ${output.bin}`,
        `mv ${output.bin}.minphr ${output.bin}`
      ];
    }
  },
  reordering: {
    name: 'reordering',
    params: { model: 'string', type: 'string', orientation: 'string', smoothing: 'float' },
    input: { phr: 'file<any>' },
    output: { reord: 'file<reordering>' },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp -d) && \\',
        `/tools/lexical-reordering-score ${input.phr} ${params.smoothing} $$TEMP/output. --model "${params.type} ${params.orientation} ${params.model}" && \\`,
        `zcat $$TEMP/output.${params.model}.gz > ${output.reord} && \\`,
        'rm -r $$TEMP'
      ];
    }
  },
  reorderingbin: {
    name: 'binarize-reordering',
    input: { reord: 'file<reordering>' },
    output: { reord: 'file<reordering-bin>' },
    toBash: (params, input, output) => {
      return [
        `/tools/processLexicalTableMin -threads 1 -in ${input.reord} -out ${output.reord}`,
        `mv ${output.reord}.minlexr ${output.reord}`
      ];
    }
  }
};
