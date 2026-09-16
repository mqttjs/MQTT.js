import { type IConnackPacket } from 'mqtt-packet'
import { ReasonCodes } from './ack'
import TopicAliasSend from '../topic-alias-send'
import { ErrorWithReasonCode, type PacketHandler } from '../shared'

const handleConnack: PacketHandler = (client, packet: IConnackPacket) => {
	client.log('_handleConnack')
	const { options } = client
	const version = options.protocolVersion
	const rc = version === 5 ? packet.reasonCode : packet.returnCode

	clearTimeout(client['connackTimer'])
	delete client['topicAliasSend']

	// Kept for the whole CONNACK, accepted or not: a refusal is where
	// `reasonString` and `serverReference` show up, and they are the only
	// explanation the application gets. Never merged into `options`, which
	// belongs to the caller.
	client['_serverProperties'] = packet.properties

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
				client['topicAliasSend'] = new TopicAliasSend(
					packet.properties.topicAliasMaximum,
				)
			}
		}
	}

	if (rc === 0) {
		client.reconnecting = false
		client['_onConnect'](packet)
	} else if (rc > 0) {
		client.log(
			'_handleConnack :: connection refused with reason code %d',
			rc,
		)
		const err = new ErrorWithReasonCode(
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
