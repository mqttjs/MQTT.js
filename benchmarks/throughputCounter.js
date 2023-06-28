#! /usr/bin/env node

const mqtt = require('../')

const client = mqtt.connect({ port: 1883, host: 'localhost', clean: true, encoding: 'binary', keepalive: 0 })
let counter = 0
const interval = 5000

function count () {
  console.log('received/s', counter / interval * 1000)
  counter = 0
}

setInterval(count, interval)

client.on('connect', function () {
  count()
  this.subscribe('test')
  this.on('message', function () {
    counter++
  })
})
