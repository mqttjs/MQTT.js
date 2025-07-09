import handlePublish from './publish'
import handleAuth from './auth'
import handleConnack from './connack'
import handleAck from './ack'
import handlePubrel from './pubrel'
import { type PacketHandler } from '../shared'

const handle: PacketHandler = (client, packet, done) => {
	const { options } = client

	if (
		options.protocolVersion === 5 &&
		options.properties &&
		options.properties.maximumPacketSize &&
		// @ts-expect-error - packet.length is possibly undefined
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
			// DO NOT SHIFT PING HERE, this would lead to https://github.com/mqttjs/MQTT.js/issues/1861
			handlePublish(client, packet, done)
			break
		case 'puback':
		case 'pubrec':
		case 'pubcomp':
		case 'suback':
		case 'unsuback':
			client.reschedulePing()
			handleAck(client, packet)

			if (done !== undefined) {
				done()
			}

			break
		case 'pubrel':
			client.reschedulePing()
			handlePubrel(client, packet, done)
			break
		case 'connack':
			// no need to reschedule ping here as keepalive manager is created after successll connect
			// (when onConnect is called at the end of handleConnack)
			handleConnack(client, packet)

			if (done !== undefined) {
				done()
			}

			break
		case 'auth':
			client.reschedulePing()
			handleAuth(client, packet)

			if (done !== undefined) {
				done()
			}

			break
		case 'pingresp':
			client.log('_handlePacket :: received pingresp')
			client.reschedulePing(true)

			if (done !== undefined) {
				done()
			}

			break
		case 'disconnect':
			client.emit('disconnect', packet)

			if (done !== undefined) {
				done()
			}

			break
		default:
			// TODO: unknown packet received. Should we emit an error?
			client.log('_handlePacket :: unknown command')

			if (done !== undefined) {
				done()
			}

			break
	}
}

export default handle
