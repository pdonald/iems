var AppDefaultGraph = {
  id: 0, title: 'Main', type: 'main', category: 'undefined',
  x: 0, y: 0, collapsed: false,
  processes: [
    { id: 2, x: 24, y: 268, type: 'tokenizer', params: { lang: "$srclang", toolsdir: "$toolsdir" } },
    { id: 3, x: 277, y: 274, type: 'tokenizer', params: { lang: "$trglang", toolsdir: "$toolsdir" } },
    { id: 105, x: 256, y: 49, type: 'opus', params: { srclang: "$srclang", trglang: "$trglang", tempdir: "$tempdir", corpus: "EUconst" } },
    { id: 107, x: 359, y: 761, type: 'moses-ini', params: { workdir: "$workdir", lmorder: "$lm-order" } },
    { id: 109, x: 46, y: 901, type: 'echo', params: { text: "hello world" } },
    { id: 111, x: 256, y: 869, type: 'echo', params: { text: "sveika pasaule" } }
  ],
  links: [
    { from: { id: 2, port: 'out' }, to: { id: 103, port: 'src' } },
    { from: { id: 3, port: 'out' }, to: { id: 103, port: 'trg' } },
    { from: { id: 3, port: 'out' }, to: { id: 104, port: 'trg' } },
    { from: { id: 103, port: 'algn' }, to: { id: 106, port: 'algn' } },
    { from: { id: 2, port: 'out' }, to: { id: 106, port: 'src' } },
    { from: { id: 3, port: 'out' }, to: { id: 106, port: 'trg' } },
    { from: { id: 105, port: 'src' }, to: { id: 2, port: 'in' } },
    { from: { id: 105, port: 'trg' }, to: { id: 3, port: 'in' } },
    { from: { id: 104, port: 'lm' }, to: { id: 107, port: 'lm' } },
    { from: { id: 106, port: 'model' }, to: { id: 107, port: 'phrases' } },
    { from: { id: 107, port: 'ini' }, to: { id: 110, port: 'ini' } },
    { from: { id: 109, port: 'out' }, to: { id: 110, port: 'src' } },
    { from: { id: 111, port: 'out' }, to: { id: 110, port: 'ref' } }
  ],
  groups: [
    {
      id: 103, title: 'Word alignment', type: 'word-alignment', category: 'alignment',
      x: 86, y: 444, collapsed: true,
      ports: { input: ['src', 'trg'], output: ['algn'] },
      processes: [
        { id: 601, x: 20, y: 50, type: 'fastalign', params: { toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 602, x: 200, y: 50, type: 'fastalign', params: { reverse: "true", toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 603, x: 120, y: 200, type: 'symalign', params: { method: "grow-diag-final-and", toolsdir: "$toolsdir" } }
      ],
      links: [
        { from: { id: 103, port: 'src' }, to: { id: 601, port: 'src' } },
        { from: { id: 103, port: 'trg' }, to: { id: 602, port: 'trg' } },
        { from: { id: 103, port: 'src' }, to: { id: 602, port: 'src' } },
        { from: { id: 103, port: 'trg' }, to: { id: 601, port: 'trg' } },
        { from: { id: 601, port: 'out' }, to: { id: 603, port: 'srctrg' } },
        { from: { id: 602, port: 'out' }, to: { id: 603, port: 'trgsrc' } },
        { from: { id: 603, port: 'out' }, to: { id: 103, port: 'algn' } }
      ]
    },
    {
      id: 104, title: 'Language model', type: 'lm-kenlm', category: 'lm',
      x: 294, y: 434, collapsed: true,
      ports: { input: ['trg'], output: ['lm'] },
      processes: [
        { id: 2, x: 20, y: 50, type: 'kenlm', params: { order: "$lm-order", memory: "$memory", toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 3, x: 20, y: 175, type: 'binarpa', params: { type: "trie", memory: "$memory", toolsdir: "$toolsdir", tempdir: "$tempdir" } }
      ],
      links: [
        { from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } },
        { from: { id: 104, port: 'trg' }, to: { id: 2, port: 'in' } },
        { from: { id: 3, port: 'out' }, to: { id: 104, port: 'lm' } }
      ]
    },
    {
      id: 106, title: 'Phrase Extraction', type: 'phraseextraction', category: 'phrases',
      x: 299, y: 618, collapsed: true,
      ports: { input: ['src', 'trg', 'algn'], output: ['model'] },
      processes: [
        { id: 1, x: 69, y: 80, type: 'extractphrases', params: { maxLength: "7", model: "xxx", toolsdir: "$toolsdir", tempdir: "$tempdir", type: "$reordering-type", orientation: "$reordering-orientation" } },
        { id: 2, x: 66, y: 258, type: 'scorephrases', params: { toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 3, x: 376, y: 109, type: 'lexical', params: { toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 4, x: 75, y: 435, type: 'phrasesbin', params: { toolsdir: "$toolsdir", threads: "$threads" } },
        { id: 5, x: 408, y: 274, type: 'reordering', params: { toolsdir: "$toolsdir", tempdir: "$tempdir", type: "$reordering-type", orientation: "$reordering-orientation", model: "$reordering-model", smoothing: "0.5" } },
        { id: 6, x: 413, y: 462, type: 'binreordering', params: { toolsdir: "$toolsdir", threads: "$threads" } },
        { id: 107, x: 247, y: 603, type: 'phrase-extraction-model', params: { model: "$reordering-model", workdir: "$workdir" } }
      ],
      links: [
        { from: { id: 111, port: 'reord' }, to: { id: 6, port: 'reord' } },
        { from: { id: 106, port: 'src' }, to: { id: 1, port: 'src' } },
        { from: { id: 106, port: 'trg' }, to: { id: 1, port: 'trg' } },
        { from: { id: 106, port: 'algn' }, to: { id: 1, port: 'algn' } },
        { from: { id: 106, port: 'src' }, to: { id: 3, port: 'src' } },
        { from: { id: 106, port: 'trg' }, to: { id: 3, port: 'trg' } },
        { from: { id: 2, port: 'ptable' }, to: { id: 4, port: 'ptable' } },
        { from: { id: 106, port: 'algn' }, to: { id: 3, port: 'algn' } },
        { from: { id: 3, port: 'srctrg' }, to: { id: 2, port: 'srctrg' } },
        { from: { id: 3, port: 'trgsrc' }, to: { id: 2, port: 'trgsrc' } },
        { from: { id: 1, port: 'o' }, to: { id: 5, port: 'phr' } },
        { from: { id: 1, port: 'out' }, to: { id: 2, port: 'phr' } },
        { from: { id: 1, port: 'inv' }, to: { id: 2, port: 'phrinv' } },
        { from: { id: 5, port: 'reord' }, to: { id: 6, port: 'reord' } },
        { from: { id: 4, port: 'minphr' }, to: { id: 107, port: 'phr' } },
        { from: { id: 6, port: 'minlexr' }, to: { id: 107, port: 'reord' } },
        { from: { id: 107, port: 'ini' }, to: { id: 106, port: 'model' } }
      ]
    },
    {
      id: 110, title: 'Evaluation', type: 'evaluation', category: 'evaluation',
      x: 191, y: 1058, collapsed: true,
      ports: { input: ['src', 'ref', 'ini'], output: ['trans', 'bleu'] },
      processes: [
        { id: 2, x: 45, y: 95, type: 'tokenizer', params: { lang: "$srclang", toolsdir: "$toolsdir" } },
        { id: 3, x: 298, y: 99, type: 'tokenizer', params: { lang: "$srclang", toolsdir: "$toolsdir" } },
        { id: 4, x: 59, y: 255, type: 'moses', params: { toolsdir: "$toolsdir" } },
        { id: 5, x: 65, y: 397, type: 'detokenizer', params: { lang: "$trglang", toolsdir: "$toolsdir" } },
        { id: 6, x: 291, y: 456, type: 'bleu', params: {  } }
      ],
      links: [
        { from: { id: 110, port: 'src' }, to: { id: 2, port: 'in' } },
        { from: { id: 110, port: 'ref' }, to: { id: 3, port: 'in' } },
        { from: { id: 110, port: 'ini' }, to: { id: 4, port: 'ini' } },
        { from: { id: 2, port: 'out' }, to: { id: 4, port: 'in' } },
        { from: { id: 4, port: 'out' }, to: { id: 5, port: 'in' } },
        { from: { id: 5, port: 'out' }, to: { id: 6, port: 'trans' } },
        { from: { id: 110, port: 'src' }, to: { id: 6, port: 'src' } },
        { from: { id: 110, port: 'ref' }, to: { id: 6, port: 'ref' } },
        { from: { id: 5, port: 'out' }, to: { id: 110, port: 'trans' } },
        { from: { id: 6, port: 'out' }, to: { id: 110, port: 'bleu' } }
      ]
    }
  ]
}
