var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
var fs = require('fs');

var running = [];

app.use(express.static('.'));
app.use(bodyParser.text());

app.get('/status', function(req, res) {
  var status = {};

  var files = fs.readdirSync('/tools/train')
    .filter(f => f.indexOf('status.') === 0)
    .map(f => f.substr('status.'.length));

  files
    .map(f => f.replace('.done', '').replace('.running', ''))
    .filter((f, index, arr) => arr.lastIndexOf(f) === index)
    .forEach(f => {
      if (files.indexOf(f + '.running') !== -1) status[f] = 'running';
      if (files.indexOf(f + '.done') !== -1) status[f] = 'done';
    });

  res.send(status);
});

app.post('/run', function(req, res) {
  execSync('rm -rf /tools/train/*');
  fs.writeFileSync('/tools/train/Makefile', req.body);

  var id = running.length;
  console.log('launching ' + id);

  var p = spawn('make', [], { cwd: '/tools/train/' });
  p.on('close', function(code) { console.log('process ' + id + ' ended with code ' + code) });
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stdout);
  running.push(p);

  res.send('got it: ' + id);
});

app.listen(8081);
