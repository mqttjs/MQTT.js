'use strict'

const test = require('tape')
const mqtt = require('../../lib/connect')
const _URL = require('url')
// eslint-disable-next-line
const parsed = _URL.parse(document.URL)
const isHttps = parsed.protocol === 'https:'
const port = parsed.port || (isHttps ? 443 : 80)
const host = parsed.hostname
const protocol = isHttps ? 'wss' : 'ws'

const client = mqtt.connect({ protocolId: 'MQIsdp', protocolVersion: 3, protocol: protocol, port: port, host: host })
client.on('offline', function () {
  console.log('client offline')
})
client.on('connect', function () {
  console.log('client connect')
})
client.on('reconnect', function () {
  console.log('client reconnect')
})

test('MQTT.js browser test', function (t) {
  t.plan(2)
  client.on('connect', function () {
    client.on('message', function (msg) {
      t.equal(msg, 'Hello World!')
    })
    client.subscribe('hello', function () {
    }).publish('hello', 'Hello World!')
  })
  client.once('close', function () {
    t.true(true)
  })
})
