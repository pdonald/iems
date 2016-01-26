"use strict"

let fs = require('fs')
let path = require('path')
let express = require('express')
let bodyParser = require('body-parser')

let api = require('./api')

let buildDir = path.join(__dirname, '..', '..', 'build')

let app = express();

app.set('json spaces', 2);

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080') // todo
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.use(api)

app.get('/bundle.js', (req, res) => res.sendFile(path.join(buildDir, 'bundle.js')))
app.get('*', (req, res) => res.sendFile(path.join(buildDir, 'index.html')))

let server = app.listen(8081, () => console.log('Server started at http://localhost:%d/', server.address().port))
