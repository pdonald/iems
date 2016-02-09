"use strict"

let fs = require('fs')
let express = require('express')
let stringify = require('json-stringify-pretty-compact')

let AwsEc2 = require('./services/awsec2').AwsEc2
let Vagrant = require('./services/vagrant').Vagrant
let Localssh = require('./services/localssh').Localssh

function loaddb() {
  db = JSON.parse(fs.readFileSync(dbfile))
}

function savedb() {
  fs.writeFileSync(dbfile, stringify(db, { maxLength: 160 }))
}

let db = {}
let dbfile = __dirname + '/../../build/db.json'

loaddb()

let services = {
  awsec2: new AwsEc2(),
  vagrant: new Vagrant(),
  localssh: new Localssh()
}

services.awsec2.connect(db.cluster.configs)
services.vagrant.connect(db.cluster.configs)
services.vagrant.scan()
services.localssh.connect(db.cluster.configs)

let app = module.exports = express.Router()

app.use('/api/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080') // todo
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.get('/api/cluster/configs', (req, res) => {
  res.send(db.cluster.configs) // todo: secret keys
})

app.post('/api/cluster/configs', (req, res) => {
  let config = req.body
  config.id = `c-${config.service}-` + Object.keys(db.cluster.configs).length + 1
  db.cluster.configs[config.id] = config
  res.send(config)
  // todo: connect
})

app.get('/api/cluster/configs/:id', (req, res) => {
  const config = db.cluster.configs[req.params.id]
  if (config) res.send(config) // todo: secret keys
  else res.status(404).send('No such config')
})

app.post('/api/cluster/configs/:id', (req, res) => {
  if (db.cluster.configs[req.params.id]) {
    let config = req.body
    config.id = req.params.id
    db.cluster.configs[config.id] = config
    res.send(config) // todo: secret keys
    // todo: connect
  } else {
    res.status(404).send('No such config')
  }
})

app.post('/api/cluster/configs/:id/clone', (req, res) => {
  if (db.cluster.configs[req.params.id]) {
    let config = Object.assign({}, db.cluster.configs[req.params.id])
    config.id = `c-${config.service}-` + Object.keys(db.cluster.configs).length + 1
    db.cluster.configs[config.id] = config
    res.send(config) // todo: secret keys
    // todo: connect
  } else {
    res.status(404).send('No such config')
  }
})

app.delete('/api/cluster/configs/:id', (req, res) => {
  if (db.cluster.configs[req.params.id]) {
    // todo: connect
    delete db.cluster.configs[req.params.id]
    res.send()
  } else {
    res.status(404).send('No such config')
  }
})

app.get('/api/cluster/services', (req, res) => {
  let result = {}
  for (let id in services) {
    result[id] = services[id].toJSON()
  }
  res.send(result)
})

app.get('/api/cluster/services/:id', (req, res) => {
  const service = services[req.params.id]
  if (service) res.send(service.toJSON())
  else res.status(404).send('No such service')
})

app.post('/api/cluster/services/:id/launch', (req, res) => {
  const service = services[req.params.id]
  if (service) {
    const config = service.configs[req.query.config]
    if (config) {
      const count = parseInt(req.query.count)
      if (!count || count < 0) count = 1
      if (count > 10) return res.status(400).send('Not starting more than 10 instances')
      for (let i = 0; i < count; i++) services[config.service].launch(config)
      res.send()
    } else {
      res.status(404).send('No such config')
    }
  } else {
    res.status(404).send('No such service')
  }
})

app.delete('/api/cluster/services/:id/instances/:iid', (req, res) => {
  const service = services[req.params.id]
  if (service) {
    service.terminate(req.params.iid)
    res.send()
  } else {
    res.status(404).send('No such service')
  }
})

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
  savedb()
  res.send()
})

app.delete('/api/experiments/:id', (req, res) => {
  if (db.experiments[req.params.id]) {
    delete db.experiments[req.params.id]
    savedb()
    res.send()
  } else {
    res.send(404, 'Not found')
  }
})

app.all('/api/*', (req, res) => {
  res.sendStatus(req.method == 'OPTIONS' ? 200 : 404)
})
