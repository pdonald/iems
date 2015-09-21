var AppDefaultGraph = {
  id: 0, title: 'Main', type: 'main', category: 'undefined',
  x: 0, y: 0, collapsed: false,
  processes: [
    { id: 2, x: 24, y: 268, type: 'tokenizer', params: { lang: "$srclang", toolsdir: "$toolsdir" } },
    { id: 3, x: 277, y: 274, type: 'tokenizer', params: { lang: "$trglang", toolsdir: "$toolsdir" } },
    { id: 105, x: 256, y: 49, type: 'opus', params: { srclang: "$srclang", trglang: "$trglang", tempdir: "$tempdir", corpus: "EUconst" } }
  ],
  links: [
    { from: { id: 2, port: 'out' }, to: { id: 103, port: 'src' } },
    { from: { id: 3, port: 'out' }, to: { id: 103, port: 'trg' } },
    { from: { id: 3, port: 'out' }, to: { id: 104, port: 'trg' } },
    { from: { id: 103, port: 'algn' }, to: { id: 106, port: 'algn' } },
    { from: { id: 2, port: 'out' }, to: { id: 106, port: 'src' } },
    { from: { id: 3, port: 'out' }, to: { id: 106, port: 'trg' } },
    { from: { id: 105, port: 'src' }, to: { id: 2, port: 'in' } },
    { from: { id: 105, port: 'trg' }, to: { id: 3, port: 'in' } }
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
    }
  ]
}
