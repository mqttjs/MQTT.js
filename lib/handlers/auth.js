const { errors } = require('./ack')

function handleAuth(client, packet) {
	const { options } = client
	const version = options.protocolVersion
	const rc = version === 5 ? packet.reasonCode : packet.returnCode

	if (version !== 5) {
		const err = new Error(
			`Protocol error: Auth packets are only supported in MQTT 5. Your version:${version}`,
		)
		err.code = rc
		client.emit('error', err)
		return
	}

	client.handleAuth(packet, (err, packet) => {
		if (err) {
			client.emit('error', err)
			return
		}

		if (rc === 24) {
			client.reconnecting = false
			client._sendPacket(packet)
		} else {
			const error = new Error(`Connection refused: ${errors[rc]}`)
			err.code = rc
			client.emit('error', error)
		}
	})
}

module.exports = handleAuth
