'use strict'

const mqtt = require('../..')
const client = mqtt.connect()

client.publish('presence', 'hello!')
// note: for a binary message from the browser you can pass a Uint8Array

client.end()
