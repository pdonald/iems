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
  experiments: require('../build/db/experiments.json'),
  cluster: {
    services: {
      awsec2: {
        id: 'awsec2',
        name: 'AWS EC2',
        title: 'Amazon Web Services (AWS) Elastic Cloud Compute (EC2)',
        ui: {
          configs: {
            columns: {
              name: { title: 'Name' },
              region: { title: 'Region' },
              instanceType: { title: 'Instance type' }
            },
            form: {
              name: { label: 'Name' },
              provider: { hidden: true, value: 'aws-ec2' },
              accessKeyId: { label: 'Access Key' },
              secretAccessKey: { secret: true, label: 'Secret Access Key' },
              region: { options: { 'eu-west-1': { title: 'EU West (Ireland)', options: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'] },
                                  'us-east-1': { title: 'US East (N. Virginia)', options: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e'] } },
                        label: 'Region' },
              instanceType: { options: ['t1.micro', 'r2.large'], label: 'Instance Type' },
              imageId: { defaultValue: 'ami-5da23a2a', label: 'Image ID' },
              sshPort: { defaultValue: 22, label: 'SSH Port' },
              sshUsername: { defaultValue: 'ubuntu', label: 'SSH Username' },
              sshPrivateKy: { label: 'SSH Private Key', secret: true }
            }
          }
        }
      },
      gcloud: {
        id: 'gcloud',
        name: 'Google Cloud',
        title: 'Google Cloud',
        ui: {
          configs: {
            columns: {
              name: { title: 'Name' },
              region: { title: 'Region' },
              type: { title: 'Instance type' }
            }
          }
        }
      }
    },
    configs: {
      '1': { id: 1, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1b', instanceType: 'r2.large', itype: 'spot'},
      '2': { id: 2, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1c', instanceType: 'r2.large', itype: 'spot'},
      '3': { id: 3, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1c', instanceType: 'r2.large', itype: 'spot'},
      '4': { id: 4, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1a', instanceType: 'r2.large', itype: 'spot'},
      '5': { id: 5, service: 'awsec2', name: 'Spot 2vCPU/15GB - $0.04/h', region: 'eu-west-1b', instanceType: 'r2.large', itype: 'spot'},
    }
  }
}

app.get('/api/cluster/services', (req, res) => {
  res.send(db.cluster.services)
})

app.get('/api/cluster/services/:id', (req, res) => {
  const service = db.cluster.services[req.params.id]
  res.status(service ? 200 : 404).send(service)
})

app.get('/api/cluster/configs', (req, res) => {
  res.send(db.cluster.configs)
})

app.post('/api/cluster/configs', (req, res) => {
  const config = db.cluster.configs[req.params.id]
  if (config) return res.status(400).send('Already exists')
  if (!db.cluster.services[req.body.service]) return res.status(400).send('Invalid service')
  delete req.body.id
  req.body.id = Object.keys(db.cluster.configs).length + 1 + 1
  db.cluster.configs[req.body.id] = req.body
  res.send(req.body)
})

app.get('/api/cluster/configs/:id', (req, res) => {
  const config = db.cluster.configs[req.params.id]
  res.status(config ? 200 : 404).send(config)
})

app.post('/api/cluster/configs/:id', (req, res) => {
  const config = db.cluster.configs[req.params.id]
  if (!config) return res.status(404)
  delete req.body.id
  delete req.body.service
  db.cluster.configs[req.params.id] = Object.assign({}, config, req.body)
  res.status(200).send(db.cluster.configs[req.params.id])
})

app.delete('/api/cluster/configs/:id', (req, res) => {
  const config = db.cluster.configs[req.params.id]
  if (config) delete db.cluster.configs[req.params.id]
  res.status(config ? 200 : 404).send()
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
