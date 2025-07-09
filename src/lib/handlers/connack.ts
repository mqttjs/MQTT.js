import { ReasonCodes } from './ack'
import TopicAliasSend from '../topic-alias-send'
import { ErrorWithReasonCode, type PacketHandler } from '../shared'
import { type IConnackPacket } from 'mqtt-packet'

// @ts-expect-error - IConnackPacket and IConnectPacket are incompatible together and should declare a parent interface. This is impossible to resolve simply here.
const handleConnack: PacketHandler = (client, packet: IConnackPacket) => {
	client.log('_handleConnack')
	const { options } = client
	const version = options.protocolVersion
	const rc = version === 5 ? packet.reasonCode : packet.returnCode

	clearTimeout(client['connackTimer'])
	// @ts-expect-error - This property is now readonly. We should avoid using delete and instead rely on regular OOP patterns with setters and getters.
	delete client['topicAliasSend']

	if (packet.properties) {
		if (packet.properties.topicAliasMaximum) {
			if (packet.properties.topicAliasMaximum > 0xffff) {
				client.emit(
					'error',
					new Error('topicAliasMaximum from broker is out of range'),
				)
				return
			}
			if (packet.properties.topicAliasMaximum > 0) {
				// @ts-expect-error - This property is now readonly. We should avoid using delete and instead rely on regular OOP patterns with setters and getters.
				client['topicAliasSend'] = new TopicAliasSend(
					packet.properties.topicAliasMaximum,
				)
			}
		}
		if (packet.properties.serverKeepAlive && options.keepalive) {
			options.keepalive = packet.properties.serverKeepAlive
		}

		if (packet.properties.maximumPacketSize) {
			if (!options.properties) {
				options.properties = {}
			}
			options.properties.maximumPacketSize =
				packet.properties.maximumPacketSize
		}
	}

	if (rc === undefined) {
		return
	}

	if (rc === 0) {
		client.reconnecting = false
		client._onConnect(packet)
	} else if (rc > 0) {
		const err = new ErrorWithReasonCode(
			// @ts-expect-error - rc should be evaluated using a typeguard to avoid such problem.
			`Connection refused: ${ReasonCodes[rc]}`,
			rc,
		)
		client.emit('error', err)
		if (client.options.reconnectOnConnackError) {
			client['_cleanUp'](true)
		}
	}
}

export default handleConnack
