let fs = require('fs')
let express = require('express')
let stringify = require('json-stringify-pretty-compact')
let logger = require('winston').loggers.get('server')

let AwsEc2 = require('./cluster/services/awsec2').AwsEc2
let Vagrant = require('./cluster/services/vagrant').Vagrant
let Localssh = require('./cluster/services/localssh').Localssh

import { Queue, HostInQueueParams } from './cluster/grid/queue'
import { Host } from './cluster/grid/host'
import { JobSpec } from '../universal/grid/JobSpec'

function loaddb() {
  logger.debug('Loading database')
  db = JSON.parse(fs.readFileSync(dbfile))
}

function savedb() {
  logger.debug('Saving database')
  fs.writeFileSync(dbfile, stringify(db, { maxLength: 160 }))
}

let db: any = {}
let dbfile = __dirname + '/../../build/db.json'

loaddb()

let services = {
  awsec2: new AwsEc2(),
  vagrant: new Vagrant(),
  localssh: new Localssh()
}

let queues: { [id: string]: Queue } = {
  main: new Queue({ id: 'main', name: 'Main' }),
}

services.awsec2.connect(db.cluster.configs)
services.vagrant.connect(db.cluster.configs)
services.vagrant.scan()

let app = express.Router()

export default app

app.use('/api/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080') // todo
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.get('/api/cluster/queues', (req, res) => {
  var result = {}
  Object.keys(queues).forEach(key => result[key] = queues[key].toSummary())
  res.send(result)
})

app.post('/api/cluster/queues', (req, res) => {
  let id = 'q' + (Object.keys(queues).length + 1) + '-' + Math.round(Math.random()*1000)
  queues[id] = new Queue({ id: id, name: req.body.name })
  res.send('OK')
})

app.post('/api/cluster/queues/:id/submit', (req, res) => {
  let queue = queues[req.params.id]
  if (queue) {
    let jobs: JobSpec[] = req.body
    try {
      queue.submitJobs(jobs)
    } catch (e) {
      logger.error(e)
      res.status(500).send(e.message)
      return
    }
    res.send('OK')
  } else {
    res.status(404).send('Queue not found')
  }
})

app.post('/api/cluster/queues/:id', (req, res) => {
  let queue = queues[req.params.id]
  if (queue) {
    for (let hostid in req.body) {
      let instance = services.vagrant.instances[hostid] || 
        services.awsec2.instances[hostid] ||
        services.localssh.instances[hostid]
      if (instance) {
        let host: Host = new Host(instance)
        let params: HostInQueueParams = { slots: req.body[hostid] }
        queue.addOrUpdateHost(host, params)
      }
    }
    res.send('')
  } else {
    res.status(404).send('')
  }
})

app.post('/api/cluster/queues/:id/jobs/:jid/stop', (req, res) => {
  let queue = queues[req.params.id]
  if (queue) {
    let jobid = req.params.jid
    queue.stopJob(jobid)
    res.send('')
  } else {
    res.status(404).send('')
  }
})

app.post('/api/cluster/queues/:id/jobs/:jid/reset', (req, res) => {
  let queue = queues[req.params.id]
  if (queue) {
    let jobid = req.params.jid
    queue.resetJob(jobid)
    res.send('')
  } else {
    res.status(404).send('')
  }
})

app.post('/api/cluster/queues/:id/jobs/:jid/delete', (req, res) => {
  let queue = queues[req.params.id]
  if (queue) {
    let jobid = req.params.jid
    queue.deleteJob(jobid)
    res.send('')
  } else {
    res.status(404).send('')
  }
})

app.delete('/api/cluster/queues/:id', (req, res) => {
  let queue = queues[req.params.id]
  if (queue) {
    queue.destroy()
    delete queues[req.params.id]
    res.send('')
  } else {
    res.status(404).send('')
  }
})

app.get('/api/cluster/file', (req, res) => {
  let hostid = req.query.host
  let filename = req.query.filename
  let size = parseInt(req.query.size) || 10 * 1024
  let raw = 'raw' in req.query
  if (raw) res.set('Content-Type', 'text/plain')
  for (let qid in queues) {
    let host = queues[qid].getHosts().filter(h => h.id == hostid)[0]
    if (host) {
      host.readFile(filename, size + 5, (err, contents) => {
        if (err) res.status(500).send(raw ? err : { err: err })
        else {
          if (contents.length > size) {
            contents = contents + '\n[ ... TRUNCATED ... ]'
          }
          res.send(raw ? contents : { contents: contents })
        }
      })
      return
    }
  }
  res.status(404).send(raw ? 'No such host' : { err: 'No such host' })
})

app.get('/api/cluster/configs', (req, res) => {
  res.send(db.cluster.configs) // todo: secret keys
})

app.post('/api/cluster/configs', (req, res) => {
  let config = req.body
  config.id = `c-${config.service}-` + Object.keys(db.cluster.configs).length + 1
  db.cluster.configs[config.id] = config
  savedb()
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
    savedb()
    res.send(config) // todo: secret keys
    // todo: connect
  } else {
    res.status(404).send('No such config')
  }
})

app.post('/api/cluster/configs/:id/clone', (req, res) => {
  if (db.cluster.configs[req.params.id]) {
    let config = JSON.parse(JSON.stringify(db.cluster.configs[req.params.id])) //Object.assign({}, db.cluster.configs[req.params.id])
    config.id = `c-${config.service}-` + Object.keys(db.cluster.configs).length + 1
    db.cluster.configs[config.id] = config
    savedb()
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
    savedb()
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
    const config = db.cluster.configs[req.query.config]
    if (config) {
      let count = parseInt(req.query.count)
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

app.post('/api/cluster/services/:id/instances/:iid/exec', (req, res) => {
  const service = services[req.params.id]
  if (service) {
    if (!req.body.vars.workdir) return res.status(400).send('No workdir variable')
    if (!req.body.makefile) return res.status(400).send('No makefile')
    let cmds = []
    cmds.push(`rm -rf ${req.body.vars.workdir}`)
    cmds.push(`mkdir -p ${req.body.vars.workdir}`)
    cmds.push(`{ cat <<'EOFFF' > ${req.body.vars.workdir}/Makefile\n${req.body.makefile}EOFFF\n}`)
    cmds.push(`cd ${req.body.vars.workdir} && make`)
    service.exec(req.params.iid, cmds.join(' && '))
    res.send()
  } else {
    res.status(404).send('No such service')
  }
})

app.get('/api/cluster/services/:id/instances/:iid/status', (req, res) => {
  const service = services[req.params.id]
  if (service) {
    if (!req.query.workdir) return res.status(400).send('No workdir variable')
    let cmd = `cd ${req.query.workdir} && ls -1`
    service.exec(req.params.iid, cmd, (err, code, stdout, stderr) => {
      if (err) return res.status(500).send(err)
      let status = {}
      stdout.trim().split('\n')
        .filter(f => f.indexOf('status.') === 0)
        .map(f => f.substr('status.'.length))
        .forEach(f => {
          let name = f.replace('.running', '').replace('.done', '')
          if (f.indexOf('.running') !== -1) status[name] = 'running'
          if (f.indexOf('.done') !== -1) status[name] = 'done'
        })
      res.send(status)
    })
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
