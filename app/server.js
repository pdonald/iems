"use strict";

let express = require('express');
let bodyParser = require('body-parser')
let spawn = require('child_process').spawn;
let exec = require('child_process').exec;
let fs = require('fs');
let path = require('path');

let app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080')
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

let db = {
  experiments: require('../build/db/experiments.js')
}

app.get('/api/experiments', (req, res) => {
  res.send(db.experiments)
})

app.get('/api/experiments/:id', (req, res) => {
  let exp = db.experiments[req.params.id]
  if (exp) {
    res.send(exp)
  } else {
    res.send(404, 'Not found');
  }
})

app.post('/api/experiments/:id', (req, res) => {
  db.experiments[req.params.id] = req.body
  fs.writeFileSync('../build/db/experiments.js', 'module.exports = ' + JSON.stringify(db.experiments, null, 2))
  res.send('ok')
})

app.delete('/api/experiments/:id', (req, res) => {
  if (db.experiments[req.params.id]) {
    delete db.experiments[req.params.id]
    fs.writeFileSync('../build/db/experiments.js', 'module.exports = ' + JSON.stringify(db.experiments, null, 2))
    res.send('ok')
  } else {
    res.send(404, 'Not found')
  }
})

app.post('/run', (req, res) => {
  if (!req.body.workdir) return res.status(400).send('No workdir variable');
  if (!req.body.makefile) return res.status(400).send('No Makefile');

  let workdir = req.body.workdir;
  let resume = req.body.resume;
  let makefile = `${workdir}/Makefile`;

  let cleancmd = resume
    ? `true`
    : `mkdir -p "${workdir}" && rm -rf "${workdir}"/*`;

  exec(cleancmd, (err, stdout, stderr) => {
    if (err) return res.status(500).send(`Could not create or delete files from workdir: ${err}`);

    fs.writeFile(makefile, req.body.makefile, err => {
      if (err) return res.status(500).send(`Could not create Makefile: ${err}`);

      let p = spawn('make', [], { cwd: workdir });
      p.on('close', code => { console.log('process exited with code ' + code) });
      p.stdout.pipe(process.stdout);
      p.stderr.pipe(process.stdout);

      res.send('ok');
    });
  });
});

app.get('/file', (req, res) => {
  if (!req.query.workdir) return res.status(400).send('No workdir');
  if (!req.query.file) return res.status(400).send('No file');

  let filename = path.join(req.query.workdir, req.query.file);

  res.sendFile(filename, { headers: { 'Content-Type': 'text/plain'} });
});

app.get('/status', (req, res) => {
  if (!req.query.workdir) return res.status(400).send('No workdir');

  fs.readdir(req.query.workdir, (err, files) => {
    if (err) return res.status(500).send(`Could not list workdir: ${err}`);

    let status = {};

    files
      .filter(f => f.indexOf('status.') === 0)
      .map(f => f.substr('status.'.length))
      .forEach(f => {
        let name = f.replace('.running', '').replace('.done', '');
        if (f.indexOf('.running') !== -1) status[name] = 'running';
        if (f.indexOf('.done') !== -1) status[name] = 'done';
      });

    res.send(status);
  })
});

app.get('/bundle.js', (req, res) => fs.createReadStream('../build/bundle.js').pipe(res))
app.get('*', (req, res) => fs.createReadStream('../build/index.html').pipe(res))

app.listen(8081, () => console.log('Started http://localhost:8081'))
