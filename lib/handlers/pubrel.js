function handlePubrel(client, packet, done) {
	client.log('handling pubrel packet')
	const callback = typeof done !== 'undefined' ? done : client.nop
	const { messageId } = packet

	const comp = { cmd: 'pubcomp', messageId }

	client.incomingStore.get(packet, (err, pub) => {
		if (!err) {
			client.emit('message', pub.topic, pub.payload, pub)
			client.handleMessage(pub, (err) => {
				if (err) {
					return callback(err)
				}
				client.incomingStore.del(pub, client.nop)
				client._sendPacket(comp, callback)
			})
		} else {
			client._sendPacket(comp, callback)
		}
	})
}

module.exports = handlePubrel
