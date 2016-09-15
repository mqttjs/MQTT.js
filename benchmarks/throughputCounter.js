#! /usr/bin/env node

var mqtt = require('../')

var client = mqtt.connect({ port: 1883, host: 'localhost', clean: true, encoding: 'binary', keepalive: 0 })
var counter = 0
var interval = 5000

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
