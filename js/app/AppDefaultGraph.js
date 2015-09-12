var AppDefaultGraph = {
  id: 0, title: 'Main', type: 'main', category: 'undefined',
  x: 0, y: 0,
  processes: [
    { id: 1400, x: 131, y: 149, width: 150, height: 50, type: 'opus', params: {} }
  ],
  links: [
    { from: { id: 1400, port: 'trg' }, to: { id: 1401, port: 'trg' } }
  ],
  groups: [
    {
      id: 1401, title: 'Language model', type: 'lm-kenlm', category: 'lm',
      x: 333, y: 285, collapsed: true,
      ports: { in: ['trg'], out: ['lm'] },
      processes: [
        { id: 2, x: 20, y: 50, width: 150, height: 50, type: 'kenlm', params: {} },
        { id: 3, x: 20, y: 175, width: 150, height: 50, type: 'binlm', params: {} }
      ],
      links: [
        { from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } },
        { from: { id: 1401, port: 'trg' }, to: { id: 2, port: 'in' } },
        { from: { id: 3, port: 'out' }, to: { id: 1401, port: 'lm' } }
      ]
    }
  ]
};
