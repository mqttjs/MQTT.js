'use strict'

const mqtt = require('../..')
const path = require('path')
const fs = require('fs')
const KEY = fs.readFileSync(path.join(__dirname, '../../certtest/ca.key'))
const CERT = fs.readFileSync(path.join(__dirname, '../../certtest/ca.crt'))

const PORT = 8883
const brokerUrl = 'mqtts://yosephhub.azure-devices.net'
const options = {
  protocolId: 'MQTT',
  protocolVersion: 4,
  clean: false,
  clientId: 'myiothubdevice',
  username: 'yosephhub.azure-devices.net/myiothubdevice/?api-version=2021-04-12',
  reconnectPeriod: 20,
  connectTimeout: 60 * 1000,
  keepalive: 180,
  reschedulePings: false,
  port: PORT,
  key: KEY,
  cert: CERT,
  rejectUnauthorized: false
}

const client = mqtt.connect(brokerUrl, options)
let number = 0
setInterval(() => {
  number++
  // client.subscribe('messages')
  client.publish('devices/myiothubdevice/messages/events/', `{ "message": "${number}"}`, { qos: 1 })
  client.on('message', function (topic, message) {
    console.log(message)
  })
}, 3000)
