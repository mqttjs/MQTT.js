'use strict'

const mqtt = require('../..')
const path = require('path')
const fs = require('fs')
const KEY = fs.readFileSync(path.join(__dirname, '..', '..', 'test', 'helpers', 'tls-key.pem'))
const CERT = fs.readFileSync(path.join(__dirname, '..', '..', 'test', 'helpers', 'tls-cert.pem'))

const PORT = 8443

const options = {
  port: PORT,
  key: KEY,
  cert: CERT,
  rejectUnauthorized: false
}

const client = mqtt.connect(options)

client.subscribe('messages')
client.publish('messages', 'Current time is: ' + new Date())
client.on('message', function (topic, message) {
  console.log(message)
})
