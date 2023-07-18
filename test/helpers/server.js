const fs = require('fs')
const { MqttServer } = require('../server')
const { MqttSecureServer } = require('../server')

module.exports.init_server = function (PORT) {
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

module.exports.init_secure_server = function (port, key, cert) {
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
