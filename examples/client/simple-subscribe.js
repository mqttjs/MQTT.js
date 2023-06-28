'use strict'

const mqtt = require('../..')
const client = mqtt.connect()

client.subscribe('presence')
client.on('message', function (topic, message) {
  console.log(message)
})
