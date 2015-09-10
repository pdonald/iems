var Tools = {
  processes: {
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
    'moses-ini': {
      name: 'moses-ini', title: 'Moses INI',
      input: { phr: ['file<phrase-table>', 'file<phrase-table-bin'], lm: 'file<binlm>', reord: 'file<reord>' },
      output: { ini: 'file<moses>' },
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
        return cmd;
      }
    },
    moses: {
      name: 'moses', title: 'moses decoder',
      input: { in: 'file<tok>', ini: 'file<moses>' },
      output: { out: 'file<tok>' },
      toBash: (params, input, output) => {
        return [
          `/tools/moses -f ${input.ini} < ${input.in} > ${output.out}`
        ];
      }
    },
    bleu: {
      name: 'bleu', title: 'BLEU',
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
      name: 'compareval', title: ' MT-ComparEval',
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
  },
  blocks: {
    'lm-kenlm': {
      id: 1, title: 'Language model', name: 'lm-kenlm',
      width: 200, height: 300,
      ports: { in: ['trg'], out: ['lm'] },
      processes: [
        { id: 2, name: 'kenlm', params: { order: 5 }, x: 20, y: 50, width: 150, height: 50 },
        { id: 3, name: 'binlm', params: { type: 'trie' }, x: 20, y: 175, width: 150, height: 50 },
      ],
      links: [
        { from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } },
        { from: { id: 1, port: 'trg' }, to: { id: 2, port: 'in' } },
        { from: { id: 3, port: 'out' }, to: { id: 1, port: 'lm' } },
      ]
    },
    'word-alignment': {
      id: 1, title: 'Word alignment', name: 'word-alignment',
      width: 400, height: 300,
      ports: { in: ['src', 'trg'], out: ['algn'] },
      processes: [
        { id: 601, name: 'fastalign', x: 20, y: 50, width: 150, height: 50 },
        { id: 602, name: 'fastalign', params: { reverse: true }, x: 200, y: 50, width: 150, height: 50 },
        { id: 603, name: 'sym', params: { method: 'grow-diag-final-and' }, x: 120, y: 200, width: 150, height: 50 },
      ],
      links: [
        { from: { id: 1, port: 'src' }, to: { id: 601, port: 'src' } },
        { from: { id: 1, port: 'trg' }, to: { id: 602, port: 'trg' } },
        { from: { id: 1, port: 'src' }, to: { id: 602, port: 'src' } },
        { from: { id: 1, port: 'trg' }, to: { id: 601, port: 'trg' } },
        { from: { id: 601, port: 'out' }, to: { id: 603, port: 'srctrg' } },
        { from: { id: 602, port: 'out' }, to: { id: 603, port: 'trgsrc' } },
        { from: { id: 603, port: 'out' }, to: { id: 1, port: 'algn' } },
      ]
    },
    evaluation: {
      id: 1, title: 'Evaluation', name: 'evaluation',
      width: 800, height: 1000,
      ports: { in: ['src', 'ref', 'ini'], out: ['trans', 'bleu'] },
      processes: [
        { id: 2, name: 'tokenizer', params: { lang: 'en' }, x: 20, y: 175, width: 150, height: 50 },
        { id: 3, name: 'tokenizer', params: { lang: 'lv' }, x: 200, y: 175, width: 150, height: 50 },
        { id: 4, name: 'moses', params: {}, x: 50, y: 500, width: 250, height: 50 },
        { id: 5, name: 'detokenizer', params: { lang: 'en' }, x: 150, y: 650, width: 150, height: 50 },
        { id: 6, name: 'bleu', params: { case: false }, x: 350, y: 750, width: 150, height: 50 },
        { id: 7, name: 'compareval', params: {server:'http://localhost:8080',experiment:'testing'}, x: 550, y: 800, width: 150, height: 50 },
      ],
      links: [
        { from: { id: 1, port: 'src' }, to: { id: 2, port: 'in' } },
        { from: { id: 1, port: 'ref' }, to: { id: 3, port: 'in' } },
        { from: { id: 1, port: 'ini' }, to: { id: 4, port: 'ini' } },
        { from: { id: 2, port: 'out' }, to: { id: 4, port: 'in' } },
        { from: { id: 4, port: 'out' }, to: { id: 5, port: 'in' } },
        { from: { id: 4, port: 'out' }, to: { id: 6, port: 'trans' } },
        { from: { id: 1, port: 'src' }, to: { id: 6, port: 'src' } },
        { from: { id: 1, port: 'ref' }, to: { id: 6, port: 'ref' } },
        { from: { id: 2, port: 'out' }, to: { id: 7, port: 'src' } },
        { from: { id: 3, port: 'out' }, to: { id: 7, port: 'ref' } },
        { from: { id: 5, port: 'out' }, to: { id: 7, port: 'trans' } },
        { from: { id: 5, port: 'out' }, to: { id: 1, port: 'trans' } },
        { from: { id: 6, port: 'out' }, to: { id: 1, port: 'bleu' } },
      ]
    },
    'phrase-extraction': {
      id: 1, title: 'Phrase extraction', name: 'phrase-extraction',
      "processes": [
        {
          "id": 777,
          "name": "phrases",
          "params": {
            "model": "wbe-msd",
            "maxLength": 7
          },
          "x": 45,
          "y": 96,
          "width": 150,
          "height": 50
        },
        {
          "id": 1088,
          "name": "phrasescore",
          "params": {},
          "x": 27,
          "y": 246,
          "width": 250,
          "height": 50
        },
        {
          "id": 1882,
          "name": "phrasesbin",
          "params": {},
          "x": 64,
          "y": 418,
          "width": 150,
          "height": 50
        },
        {
          "id": 888,
          "name": "reordering",
          "params": {
            "type": "wbe",
            "orientation": "msd",
            "model": "wbe-msd-bidirectional-fe",
            "smoothing": 0.5
          },
          "x": 368,
          "y": 198,
          "width": 150,
          "height": 50,
          "selected": false
        },
        {
          "id": 1188,
          "name": "reorderingbin",
          "params": {},
          "x": 373,
          "y": 335,
          "width": 150,
          "height": 50
        },
        {
          "id": 988,
          "name": "lexical",
          "params": {},
          "x": 242,
          "y": 69,
          "width": 150,
          "height": 50
        }
      ],
      "links": [
        {
          "from": {
            "id": 777,
            "port": "out"
          },
          "to": {
            "id": 1088,
            "port": "phr"
          }
        },
        {
          "from": {
            "id": 777,
            "port": "inv"
          },
          "to": {
            "id": 1088,
            "port": "phrinv"
          }
        },
        {
          "from": {
            "id": 988,
            "port": "srctrg"
          },
          "to": {
            "id": 1088,
            "port": "srctrg"
          }
        },
        {
          "from": {
            "id": 777,
            "port": "o"
          },
          "to": {
            "id": 888,
            "port": "phr"
          }
        },
        {
          "from": {
            "id": 988,
            "port": "trgsrc"
          },
          "to": {
            "id": 1088,
            "port": "trgsrc"
          }
        },
        {
          "from": {
            "id": 888,
            "port": "reord"
          },
          "to": {
            "id": 1188,
            "port": "reord"
          }
        },
        {
          "from": {
            "id": 1088,
            "port": "ptable"
          },
          "to": {
            "id": 1882,
            "port": "ptable"
          }
        },
        {
          "from": {
            "id": 1882,
            "port": "minphr"
          },
          "to": {
            "id": 1,
            "port": "minphr"
          }
        },
        {
          "from": {
            "id": 1188,
            "port": "minlexr"
          },
          "to": {
            "id": 1,
            "port": "minlexr"
          }
        },
        {
          "from": {
            "id": 1,
            "port": "src"
          },
          "to": {
            "id": 777,
            "port": "src"
          }
        },
        {
          "from": {
            "id": 1,
            "port": "trg"
          },
          "to": {
            "id": 777,
            "port": "trg"
          }
        },
        {
          "from": {
            "id": 1,
            "port": "src"
          },
          "to": {
            "id": 988,
            "port": "src"
          }
        },
        {
          "from": {
            "id": 1,
            "port": "trg"
          },
          "to": {
            "id": 988,
            "port": "trg"
          }
        },
        {
          "from": {
            "id": 1,
            "port": "algn"
          },
          "to": {
            "id": 988,
            "port": "algn"
          }
        },
        {
          "from": {
            "id": 1,
            "port": "algn"
          },
          "to": {
            "id": 777,
            "port": "algn"
          }
        }
      ],
      "ports": {
        "in": [
          "src",
          "trg",
          "algn"
        ],
        "out": [
          "minphr",
          "minlexr"
        ]
      },
      "width": 550,
      "height": 550
    }
  }
};
