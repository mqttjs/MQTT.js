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

const client = mqtt.connect({ protocolId: 'MQIsdp', protocolVersion: 3, protocol, port, host })
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
  t.plan(4)
  client.on('connect', function () {
    client.on('message', function (topic, msg) {
      t.equal(topic, 'hello', 'should match topic')
      t.equal(msg.toString(), 'Hello World!', 'should match payload')
      client.end(() => {
        t.pass('client should close')
      })
    })
    client.subscribe('hello', function () {
    }).publish('hello', 'Hello World!')
  })
  client.once('close', function () {
    t.pass('should emit close')
  })
})
