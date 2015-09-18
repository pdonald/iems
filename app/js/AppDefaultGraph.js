var AppDefaultGraph = {
  id: 0, title: 'Main', type: 'main', category: 'undefined',
  x: 0, y: 0, collapsed: false,
  processes: [
    { id: 1, x: 43, y: 101, width: 150, height: 50, type: 'opus', params: { srclang: "$srclang", trglang: "$trglang", corpus: "EUconst" } },
    { id: 2, x: 24, y: 268, width: 150, height: 50, type: 'tokenizer', params: { lang: "$srclang", toolsdir: "$toolsdir" } },
    { id: 3, x: 199, y: 269, width: 150, height: 50, type: 'tokenizer', params: { lang: "$trglang", toolsdir: "$toolsdir" } }
  ],
  links: [
    { from: { id: 1, port: 'src' }, to: { id: 2, port: 'in' } },
    { from: { id: 1, port: 'trg' }, to: { id: 3, port: 'in' } },
    { from: { id: 2, port: 'out' }, to: { id: 4, port: 'src' } },
    { from: { id: 3, port: 'out' }, to: { id: 4, port: 'trg' } },
    { from: { id: 3, port: 'out' }, to: { id: 5, port: 'trg' } }
  ],
  groups: [
    {
      id: 4, title: 'Word alignment', type: 'word-alignment', category: 'alignment',
      x: 45, y: 429, collapsed: true,
      ports: { in: ['src', 'trg'], out: ['algn'] },
      processes: [
        { id: 601, x: 20, y: 50, width: 150, height: 50, type: 'fastalign', params: { toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 602, x: 200, y: 50, width: 150, height: 50, type: 'fastalign', params: { toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 603, x: 120, y: 200, width: 150, height: 50, type: 'symalign', params: { method: "grow-diag-final-and", toolsdir: "$toolsdir" } }
      ],
      links: [
        { from: { id: 4, port: 'src' }, to: { id: 601, port: 'src' } },
        { from: { id: 4, port: 'trg' }, to: { id: 602, port: 'trg' } },
        { from: { id: 4, port: 'src' }, to: { id: 602, port: 'src' } },
        { from: { id: 4, port: 'trg' }, to: { id: 601, port: 'trg' } },
        { from: { id: 601, port: 'out' }, to: { id: 603, port: 'srctrg' } },
        { from: { id: 602, port: 'out' }, to: { id: 603, port: 'trgsrc' } },
        { from: { id: 603, port: 'out' }, to: { id: 4, port: 'algn' } }
      ]
    },
    {
      id: 5, title: 'Language model', type: 'lm-kenlm', category: 'lm',
      x: 259, y: 457, collapsed: true,
      ports: { in: ['trg'], out: ['lm'] },
      processes: [
        { id: 2, x: 20, y: 50, width: 150, height: 50, type: 'kenlm', params: { order: "$lm-order", memory: "$memory", toolsdir: "$toolsdir", tempdir: "$tempdir" } },
        { id: 3, x: 20, y: 175, width: 150, height: 50, type: 'binarpa', params: { type: "trie", memory: "$memory", toolsdir: "$toolsdir", tempdir: "$tempdir" } }
      ],
      links: [
        { from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } },
        { from: { id: 5, port: 'trg' }, to: { id: 2, port: 'in' } },
        { from: { id: 3, port: 'out' }, to: { id: 5, port: 'lm' } }
      ]
    }
  ]
}
