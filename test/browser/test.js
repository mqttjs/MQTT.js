'use strict'

const test = require('tape')
const mqtt = require('../../dist/mqtt.min')
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
  t.plan(6)
  client.on('connect', function () {
    client.on('message', function (topic, msg) {
      t.equal(topic, 'hello', 'should match topic')
      t.equal(msg.toString(), 'Hello World!', 'should match payload')
      client.end(() => {
        t.pass('client should close')
      })
    })

    client.subscribe('hello', function (err) {
      t.error(err, 'no error on subscribe')
      if (!err) {
        client.publish('hello', 'Hello World!', function (err) {
          t.error(err, 'no error on publish')
        })
      }
    })
  })

  client.on('error', function (err) {
    t.fail(err, 'no error')
  })

  client.once('close', function () {
    t.pass('should emit close')
  })
})
