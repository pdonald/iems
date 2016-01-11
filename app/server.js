"use strict";

let express = require('express');
let bodyParser = require('body-parser')
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
  experiments: require('../build/db/experiments.json')
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
  fs.writeFileSync('../build/db/experiments.json', JSON.stringify(db.experiments, null, 2))
  res.send('ok')
})

app.delete('/api/experiments/:id', (req, res) => {
  if (db.experiments[req.params.id]) {
    delete db.experiments[req.params.id]
    fs.writeFileSync('../build/db/experiments.json', JSON.stringify(db.experiments, null, 2))
    res.send('ok')
  } else {
    res.send(404, 'Not found')
  }
})

app.get('/bundle.js', (req, res) => fs.createReadStream('../build/bundle.js').pipe(res))
app.get('*', (req, res) => fs.createReadStream('../build/index.html').pipe(res))

app.listen(8081, () => console.log('Started http://localhost:8081'))
