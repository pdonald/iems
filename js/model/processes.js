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
    output: {
      src: {
        type: 'file<text>',
        title: (p) => p.params && p.params.srcLang ? p.params.srcLang : 'src'
      },
      trg: {
        type: 'file<text>',
        title: (p) => p.params && p.params.trgLang ? p.params.trgLang : 'trg'
      },
    },
    toTitle: (p) => {
      return `OPUS (${p.params && p.params.corpus ? p.params.corpus : '<undefined>'})`;
    },
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
    toTitle: (p) => {
      return 'fast align' + (p.params && (p.params.reverse === true || p.params.reverse == 'true') ? ' (reverse)' : '');
    },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp) && \\',
        `/tools/prep_fast_align ${input.src} ${input.trg} > $$TEMP && \\`,
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
    toTitle: (p) => {
      return 'KenLM' + (p.params && p.params.order ? `, order = ${p.params.order}` : '');
    },
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
    input: { src: 'file<tok>', trg: 'file<tok>', algn: 'file<align>' },
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
    input: { src: 'file<tok>', trg: 'file<tok>', algn: 'file<align>' },
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
    name: 'phrasesbin',
    input: { ptable: 'file<phrase-table>' },
    output: { minphr: 'file<phrase-table-bin>' },
    toBash: (params, input, output) => {
      return [
        `/tools/processPhraseTableMin -nscores 4 -threads 1 -in ${input.ptable} -out ${output.minphr}`,
        //`mv ${output.bin}.minphr ${output.bin}`
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
    name: 'reorderingbin',
    input: { reord: 'file<reordering>' },
    output: { minlexr: 'file<reordering-bin>' },
    toBash: (params, input, output) => {
      return [
        `/tools/processLexicalTableMin -threads 1 -in ${input.reord} -out ${output.minlexr}`,
        //`mv ${output.reord}.minlexr ${output.reord}`
      ];
    }
  },
  echo: {
    name: 'echo',
    input: {},
    output: { out: 'file<text>' },
    params: { text: 'string' },
    toBash: (params, input, output) => {
      return [`echo "${params.text}" > ${output.out}`];
    }
  },
  moses: {
    name: 'moses',
    input: { phr: ['file<phrase-table>', 'file<phrase-table-bin'], lm: 'file<binlm>', reord: 'file<reord>', in: 'file<tok>' },
    output: { ini: 'file<moses>', out: 'file<tok>' },
    toBash: (params, input, output) => {
      var ini = [];
      ini.push('[input-factors]')
      ini.push('0');
      ini.push('[mapping]');
      ini.push('0 T 0');
      ini.push('[distortion-limit]');
      ini.push('6');
      ini.push('[feature]');
      ini.push('UnknownWordPenalty');
      ini.push('WordPenalty');
      ini.push('PhrasePenalty');
      ini.push('Distortion');
      ini.push(`PhraseDictionaryCompact name=TranslationModel0 num-features=4 path=${input.phr} input-factor=0 output-factor=0`);
      if (input.reord) ini.push(`LexicalReordering name=LexicalReordering0 num-features=6 type=wbe-msd-bidirectional-fe-allff input-factor=0 output-factor=0 path=${input.reord.replace('.minlexr', '')}`);
      if (input.lm) ini.push(`KENLM lazyken=0 name=LM0 factor=0 path=${input.lm} order=3`);
      ini.push('[weight]');
      ini.push('UnknownWordPenalty0= 1');
      ini.push('WordPenalty0= -1');
      ini.push('PhrasePenalty0= 0.2');
      ini.push('TranslationModel0= 0.2 0.2 0.2 0.2');
      if (input.reord) ini.push('LexicalReordering0= 0.3 0.3 0.3 0.3 0.3 0.3');
      ini.push('Distortion0= 0.3');
      if (input.lm) ini.push('LM0= 0.5');

      var cmd = [];
      cmd.push(`echo > ${output.ini}`);
      ini.forEach(l => cmd.push(`echo "${l}" >> ${output.ini}`));
      cmd.push(`/tools/moses -f ${output.ini} < ${input.in} > ${output.out}`)
      return cmd;
    }
  },
  bleu: {
    name: 'bleu',
    input: { trans: 'file<text>', src: 'file<text>', ref: 'file<text>' },
    output: { out: 'file<bleu>' },
    params: { case: 'bool' },
    toBash: (params, input, output) => {
      return [
        'TEMP=$(shell mktemp -d) && \\',
        `perl /tools/wrap-sgm.perl ref xx yy < ${input.ref} > $$TEMP/ref.sgm && \\`,
        `perl /tools/wrap-sgm.perl src xx < ${input.src} > $$TEMP/src.sgm && \\`,
        `perl /tools/scripts/ems/support/wrap-xml.perl yy $$TEMP/src.sgm < ${input.trans} > $$TEMP/trans.sgm && \\`,
        `perl /tools/scripts/generic/mteval-v13a.pl -s $$TEMP/src.sgm -r $$TEMP/ref.sgm -t $$TEMP/trans.sgm -b -d 3 ${params.case ? '-c' : ''} > ${output.out} && \\`,
        `cat ${output.out} && \\`,
        'rm -r $$TEMP'
      ];
    }
  },
  detokenizer: {
    name: 'detokenizer',
    input: { in: 'file<tok>' },
    output: { out: 'file<text>' },
    params: { lang: 'language' },
    toBash: (params, input, output) => {
      return [
        `perl /tools/scripts/tokenizer/detokenizer.perl -l ${params.lang} < ${input.in} > ${output.out}`
      ];
    }
  },
  compareval: {
    name: 'compareval',
    input: { src: 'file<tok>', ref: 'file<tok>', trans: 'file<tok>' },
    output: {},
    params: { server: 'string', experiment: 'string' },
    toBash: (params, input, output) => {
      return [
        `EXPID=$(shell curl -s -X POST -F "name=${params.experiment}" -F "description=${params.experiment}" -F "source=@${input.src}" -F "reference=@${input.ref}" ${params.server}/api/experiments/upload | jq ".experiment_id") && \\`,
        `curl -s -X POST -F "name=First Task" -F "description=${params.experiment}" -F "experiment_id=$$EXPID" -F "translation=@${input.trans}" ${params.server}/api/tasks/upload`
      ];
    }
  }
};
