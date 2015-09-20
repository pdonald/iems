var AppDefaultGraph = {
  id: 0, title: 'Main', type: 'main', category: 'undefined',
  x: 0, y: 0, collapsed: false,
  processes: [
    { id: 2, x: 24, y: 268, width: 150, height: 50, type: 'tokenizer', params: { lang: "$srclang", toolsdir: "$toolsdir" } },
    { id: 3, x: 199, y: 269, width: 150, height: 50, type: 'tokenizer', params: { lang: "$trglang", toolsdir: "$toolsdir" } },
    { id: 102, x: 213, y: 80, width: 150, height: 50, type: 'cp', params: { source: "/vagrant/License.txt" } }
  ],
  links: [
    { from: { id: 102, port: 'out' }, to: { id: 2, port: 'in' } },
    { from: { id: 102, port: 'out' }, to: { id: 3, port: 'in' } },
    { from: { id: 2, port: 'out' }, to: { id: 103, port: 'src' } },
    { from: { id: 3, port: 'out' }, to: { id: 103, port: 'trg' } },
    { from: { id: 3, port: 'out' }, to: { id: 104, port: 'trg' } },
    { from: { id: 103, port: 'algn' }, to: { id: 105, port: 'algn' } },
    { from: { id: 2, port: 'out' }, to: { id: 105, port: 'src' } },
    { from: { id: 3, port: 'out' }, to: { id: 105, port: 'trg' } }
  ],
  groups: [
    {
      id: 103, title: 'Word alignment', type: 'word-alignment', category: 'alignment',
      x: 86, y: 444, collapsed: true,
      ports: { in: ['src', 'trg'], out: ['algn'] },
      processes: [
        { id: 601, x: 20, y: 50, width: 150, height: 50, type: 'fastalign', params: { toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 602, x: 200, y: 50, width: 150, height: 50, type: 'fastalign', params: { reverse: "true", toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 603, x: 120, y: 200, width: 150, height: 50, type: 'symalign', params: { method: "grow-diag-final-and", toolsdir: "$toolsdir" } }
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
      ports: { in: ['trg'], out: ['lm'] },
      processes: [
        { id: 2, x: 20, y: 50, width: 150, height: 50, type: 'kenlm', params: { order: "$lm-order", memory: "$memory", toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 3, x: 20, y: 175, width: 150, height: 50, type: 'binarpa', params: { type: "trie", memory: "$memory", toolsdir: "$toolsdir", tempdir: "$tempdir" } }
      ],
      links: [
        { from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } },
        { from: { id: 104, port: 'trg' }, to: { id: 2, port: 'in' } },
        { from: { id: 3, port: 'out' }, to: { id: 104, port: 'lm' } }
      ]
    },
    {
      id: 105, title: 'Sampling Phrases', type: 'phrasesampling', category: 'phrases',
      x: 206, y: 582, collapsed: true,
      ports: { in: ['src', 'trg', 'algn'], out: ['model'] },
      processes: [
        { id: 2, x: 20, y: 50, width: 150, height: 50, type: 'bintext', params: { toolsdir: "$toolsdir" } },
        { id: 3, x: 214, y: 50, width: 150, height: 50, type: 'bintext', params: { toolsdir: "$toolsdir" } },
        { id: 4, x: 397, y: 50, width: 150, height: 50, type: 'binalign', params: { toolsdir: "$toolsdir" } },
        { id: 5, x: 387, y: 224, width: 150, height: 50, type: 'binlex', params: { toolsdir: "$toolsdir" } },
        { id: 6, x: 135, y: 375, width: 150, height: 50, type: 'phrases-sampling-model', params: {  } }
      ],
      links: [
        { from: { id: 105, port: 'src' }, to: { id: 2, port: 'in' } },
        { from: { id: 105, port: 'trg' }, to: { id: 3, port: 'in' } },
        { from: { id: 105, port: 'algn' }, to: { id: 4, port: 'in' } },
        { from: { id: 2, port: 'out' }, to: { id: 5, port: 'src' } },
        { from: { id: 3, port: 'out' }, to: { id: 5, port: 'trg' } },
        { from: { id: 4, port: 'out' }, to: { id: 6, port: 'algn' } },
        { from: { id: 2, port: 'out' }, to: { id: 6, port: 'src' } },
        { from: { id: 3, port: 'out' }, to: { id: 6, port: 'trg' } },
        { from: { id: 5, port: 'out' }, to: { id: 6, port: 'lex' } },
        { from: { id: 4, port: 'out' }, to: { id: 5, port: 'algn' } },
        { from: { id: 6, port: 'out' }, to: { id: 105, port: 'model' } }
      ]
    }
  ]
}
