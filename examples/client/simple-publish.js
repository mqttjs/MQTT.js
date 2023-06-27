'use strict'

const mqtt = require('../..')
const client = mqtt.connect()

client.publish('presence', 'hello!')
client.end()
