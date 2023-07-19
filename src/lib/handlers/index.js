const handlePublish = require('./publish')
const handleAuth = require('./auth')
const handleConnack = require('./connack')
const handleAck = require('./ack')
const handlePubrel = require('./pubrel')

function handle(client, packet, done) {
	const { options } = client

	if (
		options.protocolVersion === 5 &&
		options.properties &&
		options.properties.maximumPacketSize &&
		options.properties.maximumPacketSize < packet.length
	) {
		client.emit('error', new Error(`exceeding packets size ${packet.cmd}`))
		client.end({
			reasonCode: 149,
			properties: { reasonString: 'Maximum packet size was exceeded' },
		})
		return client
	}
	client.log('_handlePacket :: emitting packetreceive')
	client.emit('packetreceive', packet)

	switch (packet.cmd) {
		case 'publish':
			handlePublish(client, packet, done)
			break
		case 'puback':
		case 'pubrec':
		case 'pubcomp':
		case 'suback':
		case 'unsuback':
			handleAck(client, packet)
			done()
			break
		case 'pubrel':
			handlePubrel(client, packet, done)
			break
		case 'connack':
			handleConnack(client, packet)
			done()
			break
		case 'auth':
			handleAuth(client, packet)
			done()
			break
		case 'pingresp':
			// this will be checked in _checkPing client method every keepalive interval
			client.pingResp = true
			done()
			break
		case 'disconnect':
			client.emit('disconnect', packet)
			done()
			break
		default:
			// TODO: unknown packet received. Should we emit an error?
			client.log('_handlePacket :: unknown command')
			done()
			break
	}
}

module.exports = handle
