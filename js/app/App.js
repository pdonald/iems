var App = React.createClass({
  getInitialState: function() {
    return {
      output: 'makefile',
      last: 1400,
      stack: [
        new GroupX({
  "groups": [
    {
      "groups": [],
      "processes": [
        {
          "id": 2,
          "name": "bintext",
          "params": {},
          "x": 20,
          "y": 50,
          "width": 150,
          "height": 50
        },
        {
          "id": 3,
          "name": "bintext",
          "params": {},
          "x": 245,
          "y": 51,
          "width": 150,
          "height": 50
        },
        {
          "id": 4,
          "name": "binalign",
          "params": {},
          "x": 463,
          "y": 118,
          "width": 150,
          "height": 50
        },
        {
          "id": 5,
          "name": "binlex",
          "params": {},
          "x": 443,
          "y": 397,
          "width": 150,
          "height": 50
        },
        {
          "id": 6,
          "name": "psamplemodel",
          "params": {},
          "x": 20,
          "y": 575,
          "width": 150,
          "height": 50
        }
      ],
      "links": [
        {
          "from": {
            "id": 1000,
            "port": "src"
          },
          "to": {
            "id": 2,
            "port": "in"
          }
        },
        {
          "from": {
            "id": 1000,
            "port": "trg"
          },
          "to": {
            "id": 3,
            "port": "in"
          }
        },
        {
          "from": {
            "id": 1000,
            "port": "algn"
          },
          "to": {
            "id": 4,
            "port": "in"
          }
        },
        {
          "from": {
            "id": 2,
            "port": "out"
          },
          "to": {
            "id": 5,
            "port": "src"
          }
        },
        {
          "from": {
            "id": 3,
            "port": "out"
          },
          "to": {
            "id": 5,
            "port": "trg"
          }
        },
        {
          "from": {
            "id": 4,
            "port": "out"
          },
          "to": {
            "id": 6,
            "port": "algn"
          }
        },
        {
          "from": {
            "id": 2,
            "port": "out"
          },
          "to": {
            "id": 6,
            "port": "src"
          }
        },
        {
          "from": {
            "id": 3,
            "port": "out"
          },
          "to": {
            "id": 6,
            "port": "trg"
          }
        },
        {
          "from": {
            "id": 5,
            "port": "out"
          },
          "to": {
            "id": 6,
            "port": "lex"
          }
        },
        {
          "from": {
            "id": 4,
            "port": "out"
          },
          "to": {
            "id": 5,
            "port": "algn"
          }
        },
        {
          "from": {
            "id": 6,
            "port": "out"
          },
          "to": {
            "id": 1000,
            "port": "model"
          }
        }
      ],
      "id": 1000,
      "title": "Sampling Phrases",
      "name": "phrasesampling",
      "width": 150,
      "height": 50,
      "ports": {
        "in": [
          "src",
          "trg",
          "algn"
        ],
        "out": [
          "model"
        ]
      },
      "x": 86,
      "y": 496,
      "collapsed": true
    },
    {
      "groups": [],
      "processes": [
        {
          "id": 601,
          "name": "fastalign",
          "x": 20,
          "y": 50,
          "width": 150,
          "height": 50
        },
        {
          "id": 602,
          "name": "fastalign",
          "params": {
            "reverse": true
          },
          "x": 200,
          "y": 50,
          "width": 150,
          "height": 50
        },
        {
          "id": 603,
          "name": "sym",
          "params": {
            "method": "grow-diag-final-and"
          },
          "x": 120,
          "y": 200,
          "width": 150,
          "height": 50
        }
      ],
      "links": [
        {
          "from": {
            "id": 1001,
            "port": "src"
          },
          "to": {
            "id": 601,
            "port": "src"
          }
        },
        {
          "from": {
            "id": 1001,
            "port": "trg"
          },
          "to": {
            "id": 602,
            "port": "trg"
          }
        },
        {
          "from": {
            "id": 1001,
            "port": "src"
          },
          "to": {
            "id": 602,
            "port": "src"
          }
        },
        {
          "from": {
            "id": 1001,
            "port": "trg"
          },
          "to": {
            "id": 601,
            "port": "trg"
          }
        },
        {
          "from": {
            "id": 601,
            "port": "out"
          },
          "to": {
            "id": 603,
            "port": "srctrg"
          }
        },
        {
          "from": {
            "id": 602,
            "port": "out"
          },
          "to": {
            "id": 603,
            "port": "trgsrc"
          }
        },
        {
          "from": {
            "id": 603,
            "port": "out"
          },
          "to": {
            "id": 1001,
            "port": "algn"
          }
        }
      ],
      "id": 1001,
      "title": "Word alignment",
      "name": "word-alignment",
      "width": 150,
      "height": 50,
      "ports": {
        "in": [
          "src",
          "trg"
        ],
        "out": [
          "algn"
        ]
      },
      "x": 233,
      "y": 410,
      "collapsed": true
    },
    {
      "groups": [],
      "processes": [
        {
          "id": 2,
          "name": "kenlm",
          "params": {
            "order": 5
          },
          "x": 20,
          "y": 50,
          "width": 150,
          "height": 50
        },
        {
          "id": 3,
          "name": "binlm",
          "params": {
            "type": "trie"
          },
          "x": 20,
          "y": 175,
          "width": 150,
          "height": 50
        }
      ],
      "links": [
        {
          "from": {
            "id": 2,
            "port": "out"
          },
          "to": {
            "id": 3,
            "port": "in"
          }
        },
        {
          "from": {
            "id": 1099,
            "port": "trg"
          },
          "to": {
            "id": 2,
            "port": "in"
          }
        },
        {
          "from": {
            "id": 3,
            "port": "out"
          },
          "to": {
            "id": 1099,
            "port": "lm"
          }
        }
      ],
      "id": 1099,
      "title": "Language model",
      "name": "lm-kenlm",
      "width": 150,
      "height": 50,
      "ports": {
        "in": [
          "trg"
        ],
        "out": [
          "lm"
        ]
      },
      "x": 496,
      "y": 405,
      "collapsed": true
    },
    {
      "groups": [],
      "processes": [
        {
          "id": 2,
          "name": "tokenizer",
          "params": {
            "lang": "en"
          },
          "x": 20,
          "y": 175,
          "width": 150,
          "height": 50
        },
        {
          "id": 3,
          "name": "tokenizer",
          "params": {
            "lang": "lv"
          },
          "x": 200,
          "y": 175,
          "width": 150,
          "height": 50
        },
        {
          "id": 4,
          "name": "moses",
          "params": {},
          "x": 50,
          "y": 500,
          "width": 250,
          "height": 50
        },
        {
          "id": 5,
          "name": "detokenizer",
          "params": {
            "lang": "en"
          },
          "x": 150,
          "y": 650,
          "width": 150,
          "height": 50
        },
        {
          "id": 6,
          "name": "bleu",
          "params": {
            "case": false
          },
          "x": 350,
          "y": 750,
          "width": 150,
          "height": 50
        },
        {
          "id": 7,
          "name": "compareval",
          "params": {
            "server": "http://localhost:8080",
            "experiment": "testing"
          },
          "x": 550,
          "y": 800,
          "width": 150,
          "height": 50
        }
      ],
      "links": [
        {
          "from": {
            "id": 1202,
            "port": "src"
          },
          "to": {
            "id": 2,
            "port": "in"
          }
        },
        {
          "from": {
            "id": 1202,
            "port": "ref"
          },
          "to": {
            "id": 3,
            "port": "in"
          }
        },
        {
          "from": {
            "id": 1202,
            "port": "ini"
          },
          "to": {
            "id": 4,
            "port": "ini"
          }
        },
        {
          "from": {
            "id": 2,
            "port": "out"
          },
          "to": {
            "id": 4,
            "port": "in"
          }
        },
        {
          "from": {
            "id": 4,
            "port": "out"
          },
          "to": {
            "id": 5,
            "port": "in"
          }
        },
        {
          "from": {
            "id": 4,
            "port": "out"
          },
          "to": {
            "id": 6,
            "port": "trans"
          }
        },
        {
          "from": {
            "id": 1202,
            "port": "src"
          },
          "to": {
            "id": 6,
            "port": "src"
          }
        },
        {
          "from": {
            "id": 1202,
            "port": "ref"
          },
          "to": {
            "id": 6,
            "port": "ref"
          }
        },
        {
          "from": {
            "id": 2,
            "port": "out"
          },
          "to": {
            "id": 7,
            "port": "src"
          }
        },
        {
          "from": {
            "id": 3,
            "port": "out"
          },
          "to": {
            "id": 7,
            "port": "ref"
          }
        },
        {
          "from": {
            "id": 5,
            "port": "out"
          },
          "to": {
            "id": 7,
            "port": "trans"
          }
        },
        {
          "from": {
            "id": 5,
            "port": "out"
          },
          "to": {
            "id": 1202,
            "port": "trans"
          }
        },
        {
          "from": {
            "id": 6,
            "port": "out"
          },
          "to": {
            "id": 1202,
            "port": "bleu"
          }
        }
      ],
      "id": 1202,
      "title": "Evaluation",
      "name": "evaluation",
      "width": 150,
      "height": 50,
      "ports": {
        "in": [
          "src",
          "ref",
          "ini"
        ],
        "out": [
          "trans",
          "bleu"
        ]
      },
      "x": 584,
      "y": 843,
      "collapsed": true
    }
  ],
  "processes": [
    {
      "id": 1,
      "name": "opus",
      "params": {
        "corpus": "EUconst",
        "srcLang": "en",
        "trgLang": "lv"
      },
      "x": 20,
      "y": 50,
      "width": 150,
      "height": 50
    },
    {
      "id": 2,
      "name": "tokenizer",
      "params": {
        "lang": "en"
      },
      "x": 20,
      "y": 200,
      "width": 150,
      "height": 50
    },
    {
      "id": 5,
      "name": "tokenizer",
      "params": {
        "lang": "lv"
      },
      "x": 180,
      "y": 200,
      "width": 150,
      "height": 50
    },
    {
      "id": 1100,
      "x": 202,
      "y": 688,
      "width": 300,
      "height": 50,
      "name": "moses-ini",
      "type": "moses-ini",
      "params": {}
    },
    {
      "id": 1200,
      "x": 577,
      "y": 618,
      "width": 150,
      "height": 50,
      "name": "echo",
      "type": "echo",
      "params": {text:'Europe'},
      "selected": false
    },
    {
      "id": 1201,
      "x": 767,
      "y": 626,
      "width": 150,
      "height": 50,
      "name": "echo",
      "type": "echo",
      "params": {text:'Eiropa'}
    }
  ],
  "links": [
    {
      "from": {
        "id": 1,
        "port": "src"
      },
      "to": {
        "id": 2,
        "port": "in"
      }
    },
    {
      "from": {
        "id": 1,
        "port": "trg"
      },
      "to": {
        "id": 5,
        "port": "in"
      }
    },
    {
      "from": {
        "id": 2,
        "port": "out"
      },
      "to": {
        "id": 1001,
        "port": "src"
      }
    },
    {
      "from": {
        "id": 5,
        "port": "out"
      },
      "to": {
        "id": 1001,
        "port": "trg"
      }
    },
    {
      "from": {
        "id": 2,
        "port": "out"
      },
      "to": {
        "id": 1000,
        "port": "src"
      }
    },
    {
      "from": {
        "id": 5,
        "port": "out"
      },
      "to": {
        "id": 1000,
        "port": "trg"
      }
    },
    {
      "from": {
        "id": 1001,
        "port": "algn"
      },
      "to": {
        "id": 1000,
        "port": "algn"
      }
    },
    {
      "from": {
        "id": 5,
        "port": "out"
      },
      "to": {
        "id": 1099,
        "port": "trg"
      }
    },
    {
      "from": {
        "id": 1099,
        "port": "lm"
      },
      "to": {
        "id": 1100,
        "port": "lm"
      }
    },
    {
      "from": {
        "id": 1000,
        "port": "model"
      },
      "to": {
        "id": 1100,
        "port": "sample"
      }
    },
    {
      "from": {
        "id": 1200,
        "port": "out"
      },
      "to": {
        "id": 1202,
        "port": "src"
      }
    },
    {
      "from": {
        "id": 1201,
        "port": "out"
      },
      "to": {
        "id": 1202,
        "port": "ref"
      }
    },
    {
      "from": {
        "id": 1100,
        "port": "ini"
      },
      "to": {
        "id": 1202,
        "port": "ini"
      }
    }
  ],
  "id": 0,
  "title": "Main",
  "x": 0,
  "y": 0,
  "collapsed": false
}
)
      ]
    }
  },

  mixins: [Reflux.ListenerMixin],

  componentDidMount: function() {
     this.listenTo(Actions.move, this.onMove);
     this.listenTo(Actions.add, this.onAdd);
     this.listenTo(Actions.delete, this.onDelete);
     this.listenTo(Actions.select, this.onSelect);
     this.listenTo(Actions.goIntoGroup, this.onGoIntoGroup);
     this.listenTo(Actions.connect, this.onConnect);
     this.listenTo(Actions.portSelected, p => this.selectedPort = p);
     this.listenTo(Actions.portDeselected, p => this.selectedPort = null);
     this.listenTo(Actions.paramChanged, this.onParamChanged);

     this.clipboard = new ZeroClipboard(this.refs.copyMakefileButton);
   },

  onParamChanged: function(process, key, value) {
    process[key] = value;
    this.setState({ stack: this.state.stack });
  },

  onMove: function(pos, graph, parent) {
     graph.x = pos.x;
     graph.y = pos.y;
     this.setState({ stack: this.state.stack });
  },

  onAdd: function(template, x, y) {
    var offset = ReactDOM.findDOMNode(this.refs.graph).getBoundingClientRect();
    if (x >= offset.left && x <= offset.right && y >= offset.top && y <= offset.bottom) {
      if (template.id) {
        var group = new GroupX(JSON.parse(JSON.stringify(template)));
        group.id = this.state.last;
        group.x = x - offset.left;
        group.y = y - offset.top;
        //var size = group.getCalculatedSize();
        group.width = 150;
        group.height = 50;
        group.collapsed = true;
        this.currentGraph().addGroup(group);
      } else {
        this.currentGraph().addProcess({
          id: this.state.last,
          x: x - offset.left, y: y - offset.top,
          width: template.width || 150, height: template.height || 50,
          name: template.name, type: template.name, params: {}
        });
      }
      this.setState({ last: this.state.last+1, stack: this.state.stack })
    }
  },

  onSelect: function(obj) {
    obj.selected = !obj.selected;
    this.setState({ stack: this.state.stack })
  },

  onGoIntoGroup: function(obj) {
    // prevents double click bugs
    if (obj == this.state.stack[0]) return;
    if (obj == this.state.stack[this.state.stack.length-1]) return;

    if (obj.getSize) {
      obj.collapsed = false;
      this.state.stack.push(obj);
      this.setState({ stack: this.state.stack })
    }
  },

  onDelete: function() {
    this.currentGraph().deleteSelected();
    this.setState({ stack: this.state.stack });
  },

  onConnect: function(from, to) {
    if (from && this.selectedPort) {
      // validate connection
      this.currentGraph().links.push({ from: from, to: this.selectedPort });
      this.setState({ stack: this.state.stack })
    }
  },

  changeOutputType: function(type) {
    this.setState({ output: type });
  },

  currentGraph: function() {
    return this.state.stack[this.state.stack.length-1];
  },

  goTo: function(index) {
    while (this.state.stack.length-1 != index) {
      var graph = this.state.stack.pop();
      graph.collapsed = true;
    }
    this.currentGraph().collapsed = false;
    this.setState({ stack: this.state.stack })
  },

  render: function() {
    return (
      <div className="container">
        <div className="table">
          <div className="row header-row">
            <div className="cell header-cell">
              <h1>Interactive Experiment Management System</h1>
            </div>
          </div>
          <div className="row">
            <div className="cell">
              <div className="table">
                <div className="row">
                  <div className="cell" style={{'borderRight': '1px solid #000000', 'width': '300px', 'height': '100%'}}>
                    <div className="table sidebar">
                      <div className="row">
                        <div className="cell toolbox">
                          <Toolbox/>
                        </div>
                      </div>
                      <div className="row">
                        <div className="cell properties">
                          <Properties/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="cell">
                    <nav className="depth">
                      <ul>
                        {this.state.stack.map((g, index) => <li key={index} onClick={() => this.goTo(index)}>{(g.title || g.name || '#'+g.id)}</li>)}
                      </ul>
                    </nav>
                    <div className="cell-scroll-outer" style={{'height': '80%'}}>
                      <div className="cell-scroll-inner grid">
                        <Graph ref="graph" graph={this.currentGraph()}>
                          <Group blank={true} group={this.currentGraph()}/>
                        </Graph>
                      </div>
                    </div>
                    <div className="table" style={{'borderTop': '1px solid #000'}}>
                      <div className="row">
                        <div className="cell preview">
                          <button className="copy" ref="copyMakefileButton" data-clipboard-target="makefile">Copy to clipboard</button>
                          <div className="options">
                            <label><input type="radio" readOnly name="outtype" checked={this.state.output=='makefile'?'checked':''} onClick={e => this.changeOutputType('makefile')}/> Makefile</label>
                            <label><input type="radio" readOnly name="outtype" checked={this.state.output=='json'?'checked':''} onClick={e => this.changeOutputType('json')}/> JSON</label>
                          </div>
                          <pre id="makefile">
                            {(this.state.output == 'makefile' ? genMakefile(this.currentGraph(), this.state.stack[0]) : JSON.stringify(this.currentGraph(), null, 2)) + '\n\n\n\n'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
});
