import fs from 'fs'
import { MqttServer, MqttSecureServer } from '../server'

export function init_server(PORT: number) {
	const server = new MqttServer((client) => {
		client.on('connect', () => {
			client.connack(0)
		})

		client.on('publish', (packet) => {
			switch (packet.qos) {
				case 1:
					client.puback({ messageId: packet.messageId })
					break
				case 2:
					client.pubrec({ messageId: packet.messageId })
					break
				default:
					break
			}
		})

		client.on('pubrel', (packet) => {
			client.pubcomp({ messageId: packet.messageId })
		})

		client.on('pingreq', () => {
			client.pingresp()
		})

		client.on('disconnect', () => {
			client.stream.end()
		})
	})
	server.listen(PORT)
	return server
}

export function init_secure_server(port: number, key: string, cert: string) {
	const server = new MqttSecureServer(
		{
			key: fs.readFileSync(key),
			cert: fs.readFileSync(cert),
		},
		(client) => {
			client.on('connect', () => {
				client.connack({ returnCode: 0 })
			})
		},
	)
	server.listen(port)
	return server
}
