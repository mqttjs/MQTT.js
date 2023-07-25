import abstractClientTests from './abstract_client'
import serverBuilder from './server_helpers_for_client_tests'
import UniqueMessageIdProvider from '../src/lib/unique-message-id-provider'
import ports from './helpers/port_list'
import { IClientOptions } from 'src/mqtt'

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
	})

	abstractClientTests(server, config)
})
