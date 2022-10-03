'use strict'

const test = require('tape')
const mqtt = require('../../dist/mqtt')
const _URL = require('url')
// eslint-disable-next-line
const parsed = _URL.parse(document.URL)
const isHttps = parsed.protocol === 'https:'
const port = 9991
const host = parsed.hostname
const protocol = isHttps ? 'wss' : 'ws'

console.log("port = " + port);
console.log("host = " + host);

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
    client.on('message', function (topic, msg, _packet ) {
      t.equal(topic, 'hello')
      t.equal(msg.toString(), 'Hello World!')
    })
    client.subscribe('hello', function () {
      client.publish('hello', 'Hello World!');
    });
  })
  client.once('close', function () {
    t.true(true)
  })
})
