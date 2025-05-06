import abstractClientTests from './abstract_client'
import serverBuilder from './server_helpers_for_client_tests'
import { UniqueMessageIdProvider, type IClientOptions } from '../../src'
import getPorts from './helpers/port_list'
import { describe, after } from 'node:test'

const ports = getPorts(3)

describe('UniqueMessageIdProviderMqttClient', () => {
	const server = serverBuilder('mqtt')
	const config: IClientOptions = {
		protocol: 'mqtt',
		port: ports.PORTAND400,
		messageIdProvider: new UniqueMessageIdProvider(),
	}
	server.listen(ports.PORTAND400)

	after(() => {
		// clean up and make sure the server is no longer listening...
		if (server.listening) {
			server.close()
		}

		process.exit(0)
	})

	abstractClientTests(server, config, ports)
})
