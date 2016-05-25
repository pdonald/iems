export default {
  processes: {
    cp: {
      type: 'cp', title: 'Copy local file', category: 'corpora',
      params: { source: 'string' },
      input: { },
      output: { out: 'file<any>' },
      toBash: (params, input, output) => [`cp ${params.source} ${output.out}`]
    },
    echo: {
      type: 'echo', category: 'corpora',
      input: { },
      output: { out: 'file<text>' },
      params: { text: 'string' },
      toBash: (params, input, output) => [`echo "${(params.text + '').replace('"', '\\"')}" > ${output.out}`],
      toTitle: (p, params) => {
        if (params.text) {
          if (params.text.length < 10) return `echo ${params.text}`;
          else return `echo ${params.text.substr(0, 10)}...`;
        }
        return `echo`;
      }
    },
    wget: {
      type: 'wget', category: 'corpora',
      params: { url: 'string' },
      input: { },
      output: { out: 'file<any>' },
      toBash: (params, input, output) => [`wget ${params.url} -O ${output.out}`]
    },
    opus: {
      type: 'opus', title: 'OPUS', category: 'corpora',
      params: {
        corpus: 'string',
        srclang: { type: 'language', default: '$srclang' },
        trglang: { type: 'language', default: '$trglang' },
        tempdir: { type: 'path', default: '$tempdir' }
      },
      input: { },
      output: {
        src: {
          type: 'file<text>',
          title: (p, params) => params.srclang ? params.srclang : 'src'
        },
        trg: {
          type: 'file<text>',
          title: (p, params) => params.trglang ? params.trglang : 'trg'
        },
      },
      toTitle: (p, params) => {
        if (params.corpus) return `OPUS (${params.corpus})`;
        return `OPUS`;
      },
      toBash: (params, input, output) => {
        return [
          `TEMP=$(mktemp -d --tmpdir=${params.tempdir}) && \\`,
          `docker run --rm -i -v $TEMP:$TEMP iems/opus wget http://opus.lingfil.uu.se/${params.corpus}/${params.srclang}-${params.trglang}.txt.zip -O $TEMP/corpus.zip && \\`,
          `docker run --rm -i -v $TEMP:$TEMP iems/opus unzip -p $TEMP/corpus.zip ${params.corpus}.${params.srclang}-${params.trglang}.${params.srclang} > ${output.src} && \\`,
          `docker run --rm -i -v $TEMP:$TEMP iems/opus unzip -p $TEMP/corpus.zip ${params.corpus}.${params.srclang}-${params.trglang}.${params.trglang} > ${output.trg} && \\`,
          'rm -r $TEMP'
        ];
      }
    },
    tokenizer: {
      type: 'tokenizer', title: 'Tokenizer (moses)', category: 'corpora',
      width: 200,
      params: {
        lang: { type: 'language', default: '$srclang' }
      },
      input: { in: 'file<text>' },
      output: { out: 'file<tok>' },
      toTitle: (p, params) => params.lang ? `Tokenizer [${params.lang}] (moses)` : 'Tokenizer (moses)',
      toBash: (params, input, output) => {
        return [`docker run --rm -i iems/moses perl /scripts/tokenizer/tokenizer.perl -l ${params.lang} < ${input.in} > ${output.out}`];
      }
    },
    detokenizer: {
      type: 'detokenizer', title: 'Detokenizer (moses)', category: 'corpora',
      input: { in: 'file<tok>' },
      output: { out: 'file<text>' },
      params: {
        lang: { type: 'language', default: '$trglang' }
      },
      toBash: (params, input, output) => {
        return [ `docker run --rm -i iems/moses perl /scripts/tokenizer/detokenizer.perl -l ${params.lang} < ${input.in} > ${output.out}` ];
      }
    },
    split: {
      type: 'split', title: 'Split', category: 'corpora',
      input: { in: 'file<text>' },
      output: { a: 'file<text>', b: 'file<text>' },
      params: { 
        perc: { type: 'int', default: 70, min: 1, max: 99 },
        tempdir: { type: 'path', default: '$tempdir', nohash: true } 
      },
      toTitle: (p, params) => {
        if (params.perc) {
          let x = parseInt(params.perc)
          return `Split ${x}/${100-x}%`
        }
        return `Split`;
      },
      toBash: (params, input, output) => {
        return [
          `TEMP=$(mktemp -d --tmpdir=${params.tempdir}) && \\`,
          `csplit ${input.in} $[ $(wc -l < ${input.in}) * ${params.perc} / 100 + 1] -n 1 -q -f $TEMP/split && \\`,
          `mv $TEMP/split0 ${output.a} && \\`,
          `mv $TEMP/split1 ${output.b} && \\`,
          `rm -rf $TEMP`
        ];
      }
    },
    kenlm: {
      type: 'kenlm', title: 'KenLM', category: 'lm',
      params: {
        order: { type: 'uint', default: '$lm-order', min: 1 },
        memory: { type: 'size-unit', default: '$memory', nohash: true, optional: true },
        tempdir: { type: 'path', default: '$tempdir', nohash: true }
      },
      input: { in: 'file<tok>' },
      output: { out: 'file<arpa>' },
      toTitle: (p, params) => {
        return 'KenLM' + (params.order ? `, order = ${params.order}` : '');
      },
      toBash: (params, input, output) => {
        var args = [];
        //if (params.tempdir) args.push(`-T ${params.tempdir}`); // todo
        if (params.memory) args.push(`-S ${params.memory}`);
        args.push(`-o ${params.order}`)
        args.push('--discount_fallback')
        return [`docker run --rm -i iems/kenlm lmplz ${args.join(' ')} < ${input.in} > ${output.out}`];
      }
    },
    binarpa: {
      type: 'binarpa', title: 'Binarize LM', category: 'lm',
      params: {
        type: { type: 'string', default: 'trie' },
        memory: { type: 'size-unit', default: '$memory', nohash: true, optional: true },
        //tempdir: { type: 'path', default: '$tempdir', nohash: true },
        workdir: { type: 'path', default: '$workdir', nohash: true }
      },
      input: { in: 'file<arpa>' },
      output: { out: 'file<lm-bin>' },
      toBash: (params, input, output) => {
        var args = [];
        args.push(`${params.type}`)
        //if (params.tempdir) args.push(`-T ${params.tempdir}`); // todo
        if (params.memory) args.push(`-S ${params.memory}`);
        return [`docker run --rm -i -v ${params.workdir}:/work iems/kenlm build_binary ${args.join(' ')} /work/${input.in} /work/${output.out}`];
      }
    },
    fastalign: {
      type: 'fastalign', title: 'Fast align', category: 'alignment', version: 1,
      params: {
        reverse: { type: 'bool', default: false, optional: true },
        tempdir: { type: 'path', default: '$tempdir', nohash: true },
        workdir: { type: 'path', default: '$workdir', nohash: true }
      },
      input: { src: 'file<tok>', trg: 'file<tok>' },
      output: { out: 'file<align>' },
      toTitle: (p, params) => 'fast align' + (params.reverse === true || params.reverse == 'true' ? ' (reverse)' : ''),
      toBash: (params, input, output) => {
        return [
          `TEMP=$(mktemp --tmpdir=${params.tempdir}) && \\`,
          `paste -d" ||| " ${input.src} /dev/null /dev/null /dev/null /dev/null ${input.trg} > $TEMP && \\`,
          `docker run --rm -i -v ${params.tempdir}:${params.tempdir} -v ${params.workdir}:/work iems/fastalign fast_align ${params.reverse ? '-r' : ''} -i $TEMP > ${output.out} && \\`,
          'rm $TEMP'
        ]
      }
    },
    symalign: {
      type: 'symalign', title: 'Sym alignments', category: 'alignment',
      params: {
        method: { type: 'string', default: 'grow-diag-final-and' },
        workdir: { type: 'path', default: '$workdir', nohash: true }
      },
      input: { srctrg: 'file<align>', trgsrc: 'file<align>' },
      output: { out: 'file<align>' },
      toBash: (params, input, output) => {
        return [`docker run --rm -i -v ${params.workdir}:/work iems/fastalign atools -c ${params.method} -i /work/${input.srctrg} -j /work/${input.trgsrc} > ${output.out}`];
      }
    },
    extractphrases: {
      title: 'Extract phrases', type: 'extractphrases', category: 'phrases',
      params: {
        maxLength: { type: 'uint', default: 7, min: 1 },
        type: { type: 'string', default: '$reordering-type', optional: true, options: ['wbe', 'phrase', 'hier'] },
        orientation: { type: 'string', default: '$reordering-orientation', optional: true, options: ['msd', 'mslr', 'mono'] },
        workdir: { type: 'path', default: '$workdir' },
        tempdir: { type: 'path', default: '$tempdir' }
      },
      input: { src: 'file<tok>', trg: 'file<tok>', algn: 'file<align>' },
      output: function(p, params) {
        var output: any = { out: 'file<phrases>', inv: 'file<phrases>' };
        if (params.type && params.orientation) output.o = 'file<any>';
        return output;
      },
      toBash: (params, input, output) => {
        var model = params.type && params.orientation ? `--model ${params.type}-${params.orientation}` : '';
        return [
          `TEMP=$(mktemp -d --tmpdir=${params.tempdir}) && \\`,
          `docker run --rm -i -v ${params.tempdir}:${params.tempdir} -v ${params.workdir}:/work iems/moses extract /work/${input.trg} /work/${input.src} /work/${input.algn} $TEMP/extract ${params.maxLength} orientation ${model} && \\`,
          `LC_ALL=C sort $TEMP/extract -T $TEMP > ${output.out} && \\`,
          `LC_ALL=C sort $TEMP/extract.inv -T $TEMP > ${output.inv} && \\`,
          `LC_ALL=C sort $TEMP/extract.o -T $TEMP > ${output.o} && \\`,
          'rm -r $TEMP'
        ];
      }
    },
    // todo: split into score+score+consolidate
    scorephrases: {
      title: 'Score phrases', type: 'scorephrases', category: 'phrases',
      params: {
        workdir: { type: 'path', default: '$workdir' },
        tempdir: { type: 'path', default: '$tempdir' }
      },
      input: { phr: 'file<phrases>', phrinv: 'file<phrases>', srctrg: 'file<lex>', trgsrc: 'file<lex>' },
      output: { phr: 'file<phrase-table>' },
      toBash: (params, input, output) => {
        return [
          `TEMP=$(mktemp -d --tmpdir=${params.tempdir}) && \\`,
          `docker run --rm -i -v ${params.workdir}:/work iems/moses score /work/${input.phr} /work/${input.trgsrc} /dev/stdout > $TEMP/trgsrc && \\`,
          `docker run --rm -i -v ${params.workdir}:/work iems/moses score /work/${input.phrinv} /work/${input.srctrg} /dev/stdout --Inverse > $TEMP/srctrg && \\`,
          `LC_ALL=C sort $TEMP/srctrg -T $TEMP | gzip > $TEMP/srctrg.sorted.gz && \\`,
          `LC_ALL=C sort $TEMP/trgsrc -T $TEMP | gzip > $TEMP/trgsrc.sorted.gz && \\`,
          `docker run --rm -i -v ${params.tempdir}:${params.tempdir} -v ${params.workdir}:/work iems/moses consolidate $TEMP/trgsrc.sorted.gz $TEMP/srctrg.sorted.gz /work/${output.phr} && \\`,
          'rm -r $TEMP'
        ];
      }
    },
    phrasesbin: {
      title: 'Binarize phrases', type: 'phrasesbin', category: 'phrases',
      input: { phr: 'file<phrase-table>' },
      output: { minphr: 'file<phrase-table-bin>' },
      params: {
        workdir: { type: 'path', default: '$workdir' },
        threads: { type: 'uint', default: '$threads', min: 1, optional: true }
      },
      toBash: (params, input, output) => {
        return [
          `docker run --rm -i -v ${params.workdir}:/work iems/moses processPhraseTableMin -nscores 4 -threads ${params.threads || 1} -in /work/${input.phr} -out /work/${output.minphr}`
        ];
      }
    },
    lexical: {
      title: 'Lexical', type: 'lexical', category: 'phrases',
      params: {
        workdir: { type: 'path', default: '$workdir' },
        tempdir: { type: 'path', default: '$tempdir' }
      },
      input: { src: 'file<tok>', trg: 'file<tok>', algn: 'file<align>' },
      output: { srctrg: 'file<lex>', trgsrc: 'file<lex>' },
      toBash: (params, input, output) => {
        return [
          `TEMP=$(mktemp -d --tmpdir=${params.tempdir}) && \\`,
          `docker run --rm -i -v ${params.tempdir}:${params.tempdir} -v ${params.workdir}:/work iems/moses perl /scripts/training/get-lexical.perl /work/${input.src} /work/${input.trg} /work/${input.algn} $TEMP/lex && \\`,
          `mv $TEMP/lex.e2f ${output.srctrg} && \\`,
          `mv $TEMP/lex.f2e ${output.trgsrc} && \\`,
          'rm -r $TEMP'
        ];
      }
    },
    reordering: {
      title: 'Reordering', type: 'reordering', category: 'phrases',
      params: {
        type: { type: 'string', default: '$reordering-type', options: ['wbe', 'phrase', 'hier'] },
        orientation: { type: 'string', default: '$reordering-orientation', options: ['msd', 'mslr', 'mono'] },
        model: { type: 'string', default: '$reordering-model' },
        smoothing: { type: 'float', default: 0.5 },
        workdir: { type: 'path', default: '$workdir' },
        tempdir: { type: 'path', default: '$tempdir' }
      },
      input: { phr: 'file<any>' },
      output: { reord: 'file<reordering>' },
      toBash: (params, input, output) => {
        // https://github.com/moses-smt/mosesdecoder/blob/271aaa67daee1deeebacb25093abd9641066805f/scripts/training/train-model.perl#L1896
        return [
          `TEMP=$(mktemp -d --tmpdir=${params.tempdir}) && \\`,
          `docker run --rm -i -v ${params.tempdir}:${params.tempdir} -v ${params.workdir}:/work iems/moses lexical-reordering-score /work/${input.phr} ${params.smoothing} $TEMP/output. --model "${params.type} ${params.orientation} ${params.model}" && \\`,
          `zcat $TEMP/output.${params.model}.gz > ${output.reord} && \\`,
          'rm -r $TEMP'
        ];
      }
    },
    binreordering: {
      title: 'Binarize reordering', type: 'binreordering', category: 'phrases',
      input: { reord: 'file<reordering>' },
      output: { minreord: 'file<reordering-bin>' },
      params: {
        workdir: { type: 'path', default: '$workdir' },
        threads: { type: 'uint', default: '$threads', min: 1, optional: true }
      },
      toBash: (params, input, output) => {
        return [
          `docker run --rm -i -v ${params.workdir}:/work iems/moses processLexicalTableMin -threads ${params.threads || 1} -in /work/${input.reord} -out /work/${output.minreord}`,
          //`mv ${output.reord}.minlexr ${output.reord}`
        ];
      }
    },
    'phrase-extraction-model': {
      type: 'phrase-extraction-model', title: 'Phrases model', category: 'phrases',
      input: { phr: 'file<phrase-table-bin>', reord: 'file<reordering-bin>' },
      output: { ini: 'file<moses>' },
      params: {
        model: { type: 'string', default: '$reordering-model', optional: true },
        workdir: { type: 'path', default: '$workdir' },
      },
      toBash: (params, input, output) => {
        var ini = [];
        ini.push('[feature]');
        if (input.phr) ini.push(`PhraseDictionaryCompact name=TranslationModel0 num-features=4 path=${params.workdir}/${input.phr} input-factor=0 output-factor=0`);
        if (input.reord) ini.push(`LexicalReordering name=LexicalReordering0 num-features=6 type=${params.model}-allff input-factor=0 output-factor=0 path=${params.workdir}/${input.reord.replace('.minlexr', '')}`);
        ini.push('[weight]');
        if (input.phr) ini.push('TranslationModel0= 0.2 0.2 0.2 0.2');
        if (input.reord) ini.push('LexicalReordering0= 0.3 0.3 0.3 0.3 0.3 0.3');

        var cmd = [];
        cmd.push(`echo > ${output.ini}`);
        ini.forEach(l => cmd.push(`echo "${l}" >> ${output.ini}`));
        if (input.sample) cmd.push(`cat ${input.sample}/moses.ini >> ${output.ini}`);
        return cmd;
      }
    },
    'moses-ini': {
      type: 'moses-ini', title: 'Moses INI', category: 'decoder',
      width: 300,
      input: { phrases: 'file<moses>', sample: 'dir<sample>', lm: 'file<lm-bin>' },
      output: { ini: 'file<moses>' },
      params: {
        workdir: { type: 'path', default: '$workdir' },
        lmorder: { type: 'uint', default: '$lm-order', min: 1 },
      },
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
        if (input.lm) ini.push(`KENLM lazyken=0 name=LM0 factor=0 path=${params.workdir}/${input.lm} order=${params.lmorder}`);
        ini.push('[weight]');
        ini.push('UnknownWordPenalty0= 1');
        ini.push('WordPenalty0= -1');
        ini.push('PhrasePenalty0= 0.2');
        ini.push('Distortion0= 0.3');
        if (input.lm) ini.push('LM0= 0.5');

        var cmd = [];
        cmd.push(`echo > ${output.ini}`);
        ini.forEach(l => cmd.push(`echo "${l}" >> ${output.ini}`));
        if (input.phrases) cmd.push(`cat ${input.phrases} >> ${output.ini}`);
        if (input.sample) cmd.push(`cat ${input.sample}/moses.ini >> ${output.ini}`);
        return cmd;
      }
    },
    moses: {
      type: 'moses', title: 'moses decoder', category: 'decoder',
      input: { in: 'file<tok>', ini: 'file<moses>' },
      output: { out: 'file<tok>' },
      params: {
        workdir: { type: 'path', default: '$workdir' }
      },
      toBash: (params, input, output) => {
        return [
          `docker run --rm -i -v ${params.workdir}:/work -v ${params.workdir}:${params.workdir} iems/moses moses -f /work/${input.ini} < ${input.in} > ${output.out}`
        ];
      }
    },
    bleu: {
      type: 'bleu', title: 'BLEU', category: 'evaluation',
      input: { trans: 'file<text>', ref: 'file<text>' },
      output: { out: 'file<bleu>' },
      params: {
        //case: { type: 'bool', default: true },
        workdir: { type: 'path', default: '$workdir' }
      },
      toBash: (params, input, output) => {
        return [
          `docker run --rm -i -v ${params.workdir}:/work iems/moses perl /scripts/generic/multi-bleu.perl /work/${input.ref} < ${input.trans} > ${output.out}`,
        ];
      }
    },
    bintext: {
      type: 'bintext', title: 'Binarize text', category: 'phrases-sampling',
      input: { in: 'file<tok>' },
      output: { out: 'dir<bin>' },
      params: { workdir: { type: 'path', default: '$workdir' }, },
      toBash: (params, input, output) => {
        return [
          `rm -rf ${output.out}`,
          `mkdir ${output.out}`,
          `docker run --rm -i -v ${params.workdir}:/work iems/moses mtt-build -i -o /work/${output.out}/corpus < ${input.in}`,
        ];
      }
    },
    binalign: {
      type: 'binalign', title: 'Binarize alignments', category: 'phrases-sampling',
      input: { in: 'file<align>' },
      output: { out: 'file<bin>' },
      params: { workdir: { type: 'path', default: '$workdir' } },
      toBash: (params, input, output) => {
        return [ `docker run --rm -i -v ${params.workdir}:/work iems/moses symal2mam /work/${output.out} < ${input.in}`, ];
      }
    },
    binlex: {
      type: 'binlex', title: 'Binarize lex', category: 'phrases-sampling',
      input: { src: 'dir<bin>', trg: 'dir<bin>', algn: 'file<bin>' },
      output: { out: 'file<bin>' },
      params: {
        workdir: { type: 'path', default: '$workdir' },
        tempdir: { type: 'path', default: '$tempdir' } 
      },
      toBash: (params, input, output) => {
        return [
          `TEMP=$(mktemp -d) && \\`,
          `ln -s \`readlink -f ${input.src}/corpus.mct\` $TEMP/corpus.src.mct && \\`,
          `ln -s \`readlink -f ${input.src}/corpus.sfa\` $TEMP/corpus.src.sfa && \\`,
          `ln -s \`readlink -f ${input.src}/corpus.tdx\` $TEMP/corpus.src.tdx && \\`,
          `ln -s \`readlink -f ${input.trg}/corpus.mct\` $TEMP/corpus.trg.mct && \\`,
          `ln -s \`readlink -f ${input.trg}/corpus.sfa\` $TEMP/corpus.trg.sfa && \\`,
          `ln -s \`readlink -f ${input.trg}/corpus.tdx\` $TEMP/corpus.trg.tdx && \\`,
          `ln -s \`readlink -f ${input.algn}\` $TEMP/corpus.src-trg.mam && \\`,
          `docker run --rm -i -v ${params.tempdir}:${params.tempdir} -v ${params.workdir}:/work -v ${params.workdir}:/${params.workdir} iems/moses mmlex-build $TEMP/corpus. src trg -o /work/${output.out} && \\`,
          'rm -rf $TEMP'
        ];
      }
    },
    'phrases-sampling-model': {
      type: 'phrases-sampling-model', title: 'Sampling model', category: 'phrases-sampling',
      input: { src: 'dir<bin>', trg: 'dir<bin>', algn: 'file<bin>', lex: 'file<bin>' },
      output: { out: 'dir<sample>' },
      params: { 
        workdir: { type: 'path', default: '$workdir' }
      },
      toBash: (params, input, output) => {
        var ini = [];
        ini.push('[feature]');
        ini.push('LexicalReordering name=DM0 type=hier-mslr-bidirectional-fe-allff input-factor=0 output-factor=0');
        ini.push(`Mmsapt name=PT0 lr-func=DM0 path=${params.workdir}/${output.out}/ L1=src L2=trg sample=1000`);
        ini.push('[weight]');
        ini.push('DM0= 0.3 0.3 0.3 0.3 0.3 0.3 0.3 0.3');

        var cmd = [];
        cmd.push(`rm -rf ${output.out}`);
        cmd.push(`mkdir ${output.out}`);
        cmd.push(`echo > ${output.out}/moses.ini`);
        cmd.push(`ln -s \`readlink -f ${input.src}/corpus.mct\` ${output.out}/src.mct`);
        cmd.push(`ln -s \`readlink -f ${input.src}/corpus.sfa\` ${output.out}/src.sfa`);
        cmd.push(`ln -s \`readlink -f ${input.src}/corpus.tdx\` ${output.out}/src.tdx`);
        cmd.push(`ln -s \`readlink -f ${input.trg}/corpus.mct\` ${output.out}/trg.mct`);
        cmd.push(`ln -s \`readlink -f ${input.trg}/corpus.sfa\` ${output.out}/trg.sfa`);
        cmd.push(`ln -s \`readlink -f ${input.trg}/corpus.tdx\` ${output.out}/trg.tdx`);
        cmd.push(`ln -s \`readlink -f ${input.algn}\` ${output.out}/src-trg.mam`);
        cmd.push(`ln -s \`readlink -f ${input.lex}\` ${output.out}/src-trg.lex`);
        ini.forEach(line => cmd.push(`echo "${line}" >> ${output.out}/moses.ini`));
        return cmd;
      }
    },
    mert: {
      type: 'mert', title: 'MERT', category: 'tuning',
      input: { src: 'file<tok>', ref: 'file<tok>', ini: 'file<ini>' },
      output: { ini: 'file<ini>'},
      params: { },
      toBash: (params, input, output) => {
        return [
          `TEMP=$(mktemp -d) && \\`,
          `perl /tools/scripts/training/mert-moses.pl ${input.src} ${input.ref} /tools/moses ${input.ini} --no-filter-phrase-table --mertdir /tools/ --working-dir $TEMP && \\`,
          `cp $TEMP/moses.ini ${output.ini} && \\`,
          'rm -rf $TEMP'
        ];
      }
    },
    sacompile: {
      type: 'sacompile', title: 'Suffix array', category: 'cdec',
      input: { src: 'file<tok>', trg: 'file<tok>', algn: 'file<align>' },
      output: { out: 'dir<sa>' },
      params: {
        workdir: { type: 'path', default: '$workdir' },
        tempdir: { type: 'path', default: '$tempdir' }
      },
      toBash: (params, input, output) => {
        return [
          `TEMP=$(mktemp --tmpdir=${params.tempdir}) && \\`,
          `paste -d" ||| " ${input.src} /dev/null /dev/null /dev/null /dev/null ${input.trg} > $TEMP && \\`,
          `docker run --rm -i -v ${params.tempdir}:${params.tempdir} -v ${params.workdir}:/work iems/cdec sacompile -b $TEMP -a /work/${input.algn} -c /work/${output.out}/sa.ini -o /work/${output.out} && \\`,
          'rm -f $TEMP'
        ];
      }
    },
    'cdec-model': {
      type: 'cdec-model', title: 'cdec ini', category: 'cdec',
      input: { lm: 'file<lm-bin>' },
      output: { ini: 'file<ini>'},
      params: {
        workdir: { type: 'path', default: '$workdir' }
      },
      toBash: (params, input, output) => {
        var ini = [];
        ini.push('formalism=scfg');
        ini.push('add_pass_through_rules=true');
        ini.push(`feature_function=WordPenalty`);
        if (input.lm) ini.push(`feature_function=KLanguageModel ${params.workdir}/${input.lm}`);

        var cmd = [];
        cmd.push(`rm -f ${output.ini}`);
        ini.forEach(l => cmd.push(`echo "${l}" >> ${output.ini}`));
        return cmd;
      }
    },
    cdec: {
      type: 'cdec', title: 'cdec decoder', category: 'cdec',
      input: { src: 'file<tok>', ini: 'file<ini>', sa: 'dir<sa>' },
      output: { trans: 'file<tok>', gram: 'dir<grammars>' },
      params: {
        workdir: { type: 'path', default: '$workdir' }
      },
      toBash: (params, input, output) => {
        return [
          `docker run --rm -i -v ${params.workdir}:/work -v ${params.workdir}:/${params.workdir} iems/cdec extract -c /work/${input.sa}/sa.ini -g /work/${output.gram} < ${input.src} | \\`,
          `docker run --rm -i -v ${params.workdir}:/work -v ${params.workdir}:/${params.workdir} iems/cdec cdec -c /work/${input.ini} > ${output.trans}`
        ];
      }
    },
    extractgrammars: {
      type: 'extractgrammars', title: 'Extract grammars', category: 'cdec',
      input: { src: 'file<tok>', trg: 'file<tok>', ini: 'file<ini>' },
      output: { gram: 'dir<grammars>', sgm: 'file<sgm>'},
      params: {
        threads: { type: 'uint', default: '$threads', min: 1, optional: true },
        workdir: { type: 'path', default: '$workdir' },
        tempdir: { type: 'path', default: '$tempdir' }
      },
      toBash: (params, input, output) => {
        return [
          `TEMP=$(mktemp --tmpdir=${params.tempdir}) && \\`,
          `paste -d" ||| " ${input.src} /dev/null /dev/null /dev/null /dev/null ${input.trg} > $TEMP && \\`,
          `docker run --rm -i -v ${params.tempdir}:${params.tempdir} -v ${params.workdir}:/work iems/cdec extract -c /work/${input.ini} -g /work/${output.gram} -t ${params.threads || 1} < $TEMP > /work/${output.sgm} && \\`,
          'rm -f $TEMP'
        ];
      }
    }
  },
  groups: {
    'lm-kenlm': {
      type: 'lm-kenlm', title: 'Language model', category: 'lm',
      ports: { input: ['trg'], output: ['lm'] },
      processes: [
        { id: 2, type: 'kenlm', params: { }, x: 20, y: 50 },
        { id: 3, type: 'binarpa', params: { }, x: 20, y: 175 },
      ],
      links: [
        { from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } },
        { from: { id: undefined, port: 'trg' }, to: { id: 2, port: 'in' } },
        { from: { id: 3, port: 'out' }, to: { id: undefined, port: 'lm' } },
      ]
    },
    'phraseextraction-reord': {
      title: 'Phrase Extraction w/ R', type: 'phraseextraction-reord', category: 'phrases',
      ports: { input: ['algn', 'src', 'trg'], output: ['model'] },
      processes: [
        { id: 1, x: 69, y: 80, type: 'extractphrases', params: { maxLength: "7" } },
        { id: 2, x: 66, y: 258, type: 'scorephrases', params: {} },
        { id: 3, x: 376, y: 109, type: 'lexical', params: {} },
        { id: 4, x: 75, y: 435, type: 'phrasesbin', params: {} },
        { id: 5, x: 413, y: 340, type: 'reordering', params: {} },
        { id: 6, x: 413, y: 462, type: 'binreordering', params: {} },
        { id: 7, x: 226, y: 562, type: 'phrase-extraction-model', params: {} }
      ],
      links: [
        { from: { id: undefined, port: 'src' }, to: { id: 1, port: 'src' } },
        { from: { id: undefined, port: 'trg' }, to: { id: 1, port: 'trg' } },
        { from: { id: undefined, port: 'algn' }, to: { id: 1, port: 'algn' } },
        { from: { id: undefined, port: 'src' }, to: { id: 3, port: 'src' } },
        { from: { id: undefined, port: 'trg' }, to: { id: 3, port: 'trg' } },
        { from: { id: undefined, port: 'algn' }, to: { id: 3, port: 'algn' } },
        { from: { id: 1, port: 'out' }, to: { id: 2, port: 'phr' } },
        { from: { id: 1, port: 'inv' }, to: { id: 2, port: 'phrinv' } },
        { from: { id: 3, port: 'srctrg' }, to: { id: 2, port: 'srctrg' } },
        { from: { id: 3, port: 'trgsrc' }, to: { id: 2, port: 'trgsrc' } },
        { from: { id: 2, port: 'phr' }, to: { id: 4, port: 'phr' } },
        { from: { id: 1, port: 'o' }, to: { id: 5, port: 'phr' } },
        { from: { id: 5, port: 'reord' }, to: { id: 6, port: 'reord' } },
        { from: { id: 4, port: 'minphr' }, to: { id: 7, port: 'phr' } },
        { from: { id: 6, port: 'minreord' }, to: { id: 7, port: 'reord' } },
        { from: { id: 7, port: 'ini' }, to: { id: undefined, port: 'model' } }
      ]
    },
    'phraseextraction': {
      title: 'Phrase Extraction', type: 'phraseextraction', category: 'phrases',
      ports: { input: ['algn', 'src', 'trg'], output: ['model'] },
      processes: [
        { id: 1, x: 69, y: 80, type: 'extractphrases', params: { maxLength: "7" } },
        { id: 2, x: 66, y: 258, type: 'scorephrases', params: {} },
        { id: 3, x: 376, y: 109, type: 'lexical', params: {} },
        { id: 4, x: 75, y: 435, type: 'phrasesbin', params: {} },
        { id: 7, x: 226, y: 562, type: 'phrase-extraction-model', params: {} }
      ],
      links: [
        { from: { id: undefined, port: 'src' }, to: { id: 1, port: 'src' } },
        { from: { id: undefined, port: 'trg' }, to: { id: 1, port: 'trg' } },
        { from: { id: undefined, port: 'algn' }, to: { id: 1, port: 'algn' } },
        { from: { id: undefined, port: 'src' }, to: { id: 3, port: 'src' } },
        { from: { id: undefined, port: 'trg' }, to: { id: 3, port: 'trg' } },
        { from: { id: undefined, port: 'algn' }, to: { id: 3, port: 'algn' } },
        { from: { id: 1, port: 'out' }, to: { id: 2, port: 'phr' } },
        { from: { id: 1, port: 'inv' }, to: { id: 2, port: 'phrinv' } },
        { from: { id: 3, port: 'srctrg' }, to: { id: 2, port: 'srctrg' } },
        { from: { id: 3, port: 'trgsrc' }, to: { id: 2, port: 'trgsrc' } },
        { from: { id: 2, port: 'phr' }, to: { id: 4, port: 'phr' } },
        { from: { id: 1, port: 'o' }, to: { id: 5, port: 'phr' } },
        { from: { id: 4, port: 'minphr' }, to: { id: 7, port: 'phr' } },
        { from: { id: 7, port: 'ini' }, to: { id: undefined, port: 'model' } }
      ]
    },
    'phrasesampling': {
      title: 'Sampling Phrases', type: 'phrasesampling', category: 'phrases-sampling',
      ports: { input: ['algn', 'src', 'trg'], output: ['model'] },
      processes: [
        { id: 2, x: 20, y: 50, type: 'bintext' },
        { id: 3, x: 214, y: 50, type: 'bintext' },
        { id: 4, x: 397, y: 50, type: 'binalign' },
        { id: 5, x: 387, y: 224, type: 'binlex' },
        { id: 6, x: 135, y: 375, type: 'phrases-sampling-model' }
      ],
      links: [
        { from: { id: undefined, port: 'src' }, to: { id: 2, port: 'in' } },
        { from: { id: undefined, port: 'trg' }, to: { id: 3, port: 'in' } },
        { from: { id: undefined, port: 'algn' }, to: { id: 4, port: 'in' } },
        { from: { id: 2, port: 'out' }, to: { id: 5, port: 'src' } },
        { from: { id: 3, port: 'out' }, to: { id: 5, port: 'trg' } },
        { from: { id: 4, port: 'out' }, to: { id: 6, port: 'algn' } },
        { from: { id: 2, port: 'out' }, to: { id: 6, port: 'src' } },
        { from: { id: 3, port: 'out' }, to: { id: 6, port: 'trg' } },
        { from: { id: 5, port: 'out' }, to: { id: 6, port: 'lex' } },
        { from: { id: 4, port: 'out' }, to: { id: 5, port: 'algn' } },
        { from: { id: 6, port: 'out' }, to: { id: undefined, port: 'model' } }
      ]
    },
    'word-alignment': {
      type: 'word-alignment', title: 'Word alignment', category: 'alignment',
      ports: { input: ['src', 'trg'], output: ['algn'] },
      processes: [
        { id: 601, type: 'fastalign', params: { reverse: false }, x: 20, y: 50 },
        { id: 602, type: 'fastalign', params: { reverse: true }, x: 200, y: 50 },
        { id: 603, type: 'symalign', params: { }, x: 120, y: 200 },
      ],
      links: [
        { from: { id: undefined, port: 'src' }, to: { id: 601, port: 'src' } },
        { from: { id: undefined, port: 'trg' }, to: { id: 602, port: 'trg' } },
        { from: { id: undefined, port: 'src' }, to: { id: 602, port: 'src' } },
        { from: { id: undefined, port: 'trg' }, to: { id: 601, port: 'trg' } },
        { from: { id: 601, port: 'out' }, to: { id: 603, port: 'srctrg' } },
        { from: { id: 602, port: 'out' }, to: { id: 603, port: 'trgsrc' } },
        { from: { id: 603, port: 'out' }, to: { id: undefined, port: 'algn' } },
      ]
    },
    evaluation: {
      title: 'Evaluation', type: 'evaluation', category: 'evaluation',
      ports: { input: ['src', 'ref', 'ini'], output: ['trans', 'bleu'] },
      processes: [
        { id: 2, x: 45, y: 95, type: 'tokenizer', params: { lang: '$srclang' } },
        { id: 4, x: 59, y: 255, type: 'moses' },
        { id: 5, x: 65, y: 397, type: 'detokenizer', params: { lang: '$trglang' } },
        { id: 6, x: 291, y: 456, type: 'bleu' }
      ],
      links: [
        { from: { id: undefined, port: 'src' }, to: { id: 2, port: 'in' } },
        { from: { id: undefined, port: 'ref' }, to: { id: 3, port: 'in' } },
        { from: { id: undefined, port: 'ini' }, to: { id: 4, port: 'ini' } },
        { from: { id: 2, port: 'out' }, to: { id: 4, port: 'in' } },
        { from: { id: 4, port: 'out' }, to: { id: 5, port: 'in' } },
        { from: { id: 5, port: 'out' }, to: { id: 6, port: 'trans' } },
        { from: { id: undefined, port: 'ref' }, to: { id: 6, port: 'ref' } },
        { from: { id: 5, port: 'out' }, to: { id: undefined, port: 'trans' } },
        { from: { id: 6, port: 'out' }, to: { id: undefined, port: 'bleu' } }
      ]
    }
  }
};
