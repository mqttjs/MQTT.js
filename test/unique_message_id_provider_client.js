'use strict'

var abstractClientTests = require('./abstract_client')
var serverBuilder = require('./server_helpers_for_client_tests').serverBuilder
var UniqueMessageIdProvider = require('../lib/unique-message-id-provider')
var ports = require('./helpers/port_list')

describe('UniqueMessageIdProviderMqttClient', function () {
  var server = serverBuilder('mqtt')
  var config = {protocol: 'mqtt', port: ports.PORTAND400, messageIdProvider: new UniqueMessageIdProvider()}
  server.listen(ports.PORTAND400)

  after(function () {
    // clean up and make sure the server is no longer listening...
    if (server.listening) {
      server.close()
    }
  })

  abstractClientTests(server, config)
})
