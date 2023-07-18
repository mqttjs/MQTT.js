const abstractClientTests = require('./abstract_client')
const { serverBuilder } = require('./server_helpers_for_client_tests')
const UniqueMessageIdProvider = require('../lib/unique-message-id-provider')
const ports = require('./helpers/port_list')

describe('UniqueMessageIdProviderMqttClient', () => {
	const server = serverBuilder('mqtt')
	const config = {
		protocol: 'mqtt',
		port: ports.PORTAND400,
		messageIdProvider: new UniqueMessageIdProvider(),
	}
	server.listen(ports.PORTAND400)

	after((done) => {
		// clean up and make sure the server is no longer listening...
		if (server.listening) {
			for (const socket of server.connectionList) {
				socket.destroy()
			}

			server.close(done)
		}
	})

	abstractClientTests(server, config)
})
