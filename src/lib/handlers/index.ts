import handlePublish from './publish'
import handleAuth from './auth'
import handleConnack from './connack'
import handleAck from './ack'
import handlePubrel from './pubrel'
import { ErrorWithReasonCode, type PacketHandler } from '../shared'

/**
 * Bytes the Remaining Length of a packet takes on the wire: it is a variable
 * byte integer, 7 bits of payload per byte (§1.5.5).
 */
const remainingLengthBytes = (remainingLength: number) => {
	if (remainingLength < 128) return 1
	if (remainingLength < 16384) return 2
	if (remainingLength < 2097152) return 3
	return 4
}

/**
 * Size of a received packet as `Maximum Packet Size` counts it: the total
 * number of bytes in the packet (§3.1.2.11.4, §2.1.4). mqtt-packet reports
 * `packet.length` as the Remaining Length, which by §2.1.4 excludes both the
 * fixed header byte and the bytes encoding the Remaining Length itself.
 */
const totalPacketSize = (remainingLength: number) =>
	1 + remainingLengthBytes(remainingLength) + remainingLength

const handle: PacketHandler = (client, packet, done, pump) => {
	const { options } = client

	// only the client advertised limit bounds inbound packets: CONNECT
	// `Maximum Packet Size` (§3.1.2.11.4) is what *we* accept, while the CONNACK
	// one (§3.2.2.3.6) is what the broker accepts and bounds what we send
	const maximumPacketSize = options.properties?.maximumPacketSize
	const packetSize = totalPacketSize(packet.length)

	if (
		options.protocolVersion === 5 &&
		maximumPacketSize &&
		maximumPacketSize < packetSize
	) {
		client.log(
			'_handlePacket :: %s packet of %d bytes exceeds the advertised maximumPacketSize %d',
			packet.cmd,
			packetSize,
			maximumPacketSize,
		)
		// drop the connection without disabling reconnect: a broker must not be
		// able to kill the client for good by sending one oversized packet.
		// Tear down before emitting: `emit('error')` throws when nothing listens
		// - a directly constructed `MqttClient` has no listener, only
		// `mqtt.connect()` attaches one - and an application handler can throw
		// too, which would leave the connection up.
		//
		// The rest of the chunk this packet came in goes with it, and the pump
		// is then told the packet is done: the chunk is parsed in full before
		// its first packet is handled, so what an attacker packed behind the
		// oversized one must not run against the stream we just destroyed, and
		// the `_write` callback waiting on it must not be stranded.
		pump?.discardParsedPackets()
		client['_cleanUp'](true)
		done()
		client.emit(
			'error',
			new ErrorWithReasonCode(
				`exceeding packets size ${packet.cmd}: ${packetSize} bytes, maximumPacketSize is ${maximumPacketSize}`,
				149,
			),
		)
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
			// See the ack case above for why `done` is in a `finally`.
			try {
				handleConnack(client, packet, pump)
			} finally {
				done()
			}
			break
		case 'auth':
			client.reschedulePing()
			// See the ack case above for why `done` is in a `finally`.
			try {
				handleAuth(client, packet, pump)
			} finally {
				done()
			}
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
