'use strict'

const MqttServer = require('../server').MqttServer

new MqttServer(function (client) {
  client.on('connect', function () {
    client.connack({ returnCode: 0 })
  })
}).listen(3481, 'localhost')
