#! /usr/bin/env node

var mqtt = require('../')
var client = mqtt.connect({ port: 1883, host: 'localhost', clean: true, keepalive: 0 })

var sent = 0
var interval = 5000

function count () {
  console.log('sent/s', sent / interval * 1000)
  sent = 0
}

setInterval(count, interval)

function publish () {
  sent++
  client.publish('test', 'payload', publish)
}

client.on('connect', publish)

client.on('error', function () {
  console.log('reconnect!')
  client.stream.end()
})
