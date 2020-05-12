'use strict'

var MqttServer = require('../server').MqttServer

new MqttServer(function (client) {
  client.on('connect', function () {
    client.connack({ returnCode: 0 })
  })
}).listen(3000, 'localhost')
