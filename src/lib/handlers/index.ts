import handlePublish from './publish'
import handleAuth from './auth'
import handleConnack from './connack'
import handleAck from './ack'
import handlePubrel from './pubrel'
import { type PacketHandler } from '../shared'

const handle: PacketHandler = (client, packet, done, pump) => {
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
			// DO NOT SHIFT PING HERE, this would lead to https://github.com/mqttjs/MQTT.js/issues/1861
			handlePublish(client, packet, done, pump)
			break
		case 'puback':
		case 'pubrec':
		case 'pubcomp':
		case 'suback':
		case 'unsuback':
			client.reschedulePing()
			// `done` completes the pending `_write`, so it has to run even when
			// the handler throws on its way out. `emit('error')` throws
			// synchronously when nothing listens -- a directly constructed
			// `MqttClient` has no listener, only `mqtt.connect()` attaches one
			// -- and an application listener may throw of its own accord. The
			// ack path deliberately leaves the connection up, so skipping
			// `done` would wedge the pump on a live socket that keeps pinging
			// and never reconnects.
			try {
				handleAck(client, packet)
			} finally {
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
			done()
			break
		case 'auth':
			client.reschedulePing()
			handleAuth(client, packet)
			done()
			break
		case 'pingresp':
			client.log('_handlePacket :: received pingresp')
			client.reschedulePing(true)
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

export default handle
