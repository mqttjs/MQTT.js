'use strict'

const abstractClientTests = require('./abstract_client')
const serverBuilder = require('./server_helpers_for_client_tests').serverBuilder
const UniqueMessageIdProvider = require('../lib/unique-message-id-provider')
const ports = require('./helpers/port_list')

describe('UniqueMessageIdProviderMqttClient', function () {
  const server = serverBuilder('mqtt')
  const config = { protocol: 'mqtt', port: ports.PORTAND400, messageIdProvider: new UniqueMessageIdProvider() }
  server.listen(ports.PORTAND400)

  after(function () {
    // clean up and make sure the server is no longer listening...
    if (server.listening) {
      server.close()
    }
  })

  abstractClientTests(server, config)
})
