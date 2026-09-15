import { type IPublishPacket } from 'mqtt-packet'
import {
	ErrorWithReasonCode,
	type DoneCallback,
	type PacketHandler,
} from '../shared'
import type MqttClient from '../client'

const validReasonCodes = [0, 16, 128, 131, 135, 144, 145, 151, 153]

/** MQTT 5 reason code 0x94, "Topic Alias invalid" */
const TOPIC_ALIAS_INVALID = 148

/**
 * Reject a PUBLISH whose Topic Alias breaks the protocol: tear the connection
 * down so the usual reconnect logic runs, then tell the application.
 *
 * Order matters on all three steps:
 *
 * - `_cleanUp` runs before the `emit`. A directly constructed `MqttClient` has
 *   no default `error` listener (only `mqtt.connect()` attaches one), and an
 *   application listener may throw; either way the throw would skip the
 *   teardown and wedge the pump.
 * - the rest of the chunk is dropped before `done`. `_write` parses the whole
 *   TCP chunk into the pump's queue before the first packet is handled, so
 *   without this the pump would keep running the packets of a broker we just
 *   declared in violation against a destroyed stream: `message` events after
 *   `close`, `incomingStore.put`, and PUBACK/PUBREC writes that come back as
 *   `ERR_STREAM_DESTROYED` errors.
 * - `done` must still be called. It is the pump callback, and with the queue
 *   emptied it just completes the pending `_write` instead of pumping more
 *   packets. Skipping it strands that write callback. Both the queue and the
 *   callback are scoped to one `connect()` call, so neither can reach the
 *   connection the reconnect creates.
 */
const rejectTopicAlias = (
	client: MqttClient,
	message: string,
	done: DoneCallback,
) => {
	client['_cleanUp'](true)
	client['_discardParsedPackets']()
	done()
	client.emit('error', new ErrorWithReasonCode(message, TOPIC_ALIAS_INVALID))
}

/*
  those late 2 case should be rewrite to comply with coding style:

  case 1:
  case 0:
    // do not wait sending a puback
    // no callback passed
    if (1 === qos) {
      this._sendPacket({
        cmd: 'puback',
        messageId: messageId
      });
    }
    // emit the message event for both qos 1 and 0
    this.emit('message', topic, message, packet);
    this.handleMessage(packet, done);
    break;
  default:
    // do nothing but every switch mus have a default
    // log or throw an error about unknown qos
    break;

  for now i just suppressed the warnings
  */
const handlePublish: PacketHandler = (client, packet: IPublishPacket, done) => {
	client.log('handlePublish: packet %o', packet)
	done = typeof done !== 'undefined' ? done : client.noop
	let topic = packet.topic.toString()
	const message = packet.payload
	const { qos } = packet
	const { messageId } = packet
	const { options } = client
	if (client.options.protocolVersion === 5) {
		let alias: number
		if (packet.properties) {
			alias = packet.properties.topicAlias
		}
		if (typeof alias !== 'undefined') {
			const topicAliasRecv = client['topicAliasRecv']
			if (!topicAliasRecv) {
				// The client never advertised a Topic Alias Maximum (it defaults
				// to 0), so per MQTT 5 it must not receive any Topic Alias. A
				// broker sending one is violating the protocol: reject it instead
				// of dereferencing the uninitialized receiver, which would throw
				// an uncaught TypeError and crash the process (GHSA-c8jq-r765-cq7g).
				client.log(
					'handlePublish :: received unexpected topic alias. alias: %d',
					alias,
				)
				rejectTopicAlias(
					client,
					'Received a PUBLISH Topic Alias but no Topic Alias Maximum was advertised',
					done,
				)
				return
			}
			if (topic.length === 0) {
				if (alias > 0 && alias <= 0xffff) {
					const gotTopic = topicAliasRecv.getTopicByAlias(alias)
					if (gotTopic) {
						topic = gotTopic
						client.log(
							'handlePublish :: topic complemented by alias. topic: %s - alias: %d',
							topic,
							alias,
						)
					} else {
						client.log(
							'handlePublish :: unregistered topic alias. alias: %d',
							alias,
						)
						rejectTopicAlias(
							client,
							'Received unregistered Topic Alias',
							done,
						)
						return
					}
				} else {
					client.log(
						'handlePublish :: topic alias out of range. alias: %d',
						alias,
					)
					rejectTopicAlias(
						client,
						`Received Topic Alias ${alias} is outside the valid range 1-65535`,
						done,
					)
					return
				}
			} else if (topicAliasRecv.put(topic, alias)) {
				client.log(
					'handlePublish :: registered topic: %s - alias: %d',
					topic,
					alias,
				)
			} else {
				// `put` also rejects alias 0, so this covers both halves of the
				// advertised range, not just the upper bound
				client.log(
					'handlePublish :: topic alias outside the advertised maximum. alias: %d - max: %d',
					alias,
					topicAliasRecv.max,
				)
				rejectTopicAlias(
					client,
					`Received Topic Alias ${alias} is outside the advertised Topic Alias Maximum range 1-${topicAliasRecv.max}`,
					done,
				)
				return
			}
		}
	}
	client.log('handlePublish: qos %d', qos)
	switch (qos) {
		case 2: {
			options.customHandleAcks(
				topic,
				message as Buffer,
				packet,
				(error, code) => {
					if (typeof error === 'number') {
						code = error
						error = null
					}
					if (error) {
						return client.emit('error', error as Error)
					}
					if (validReasonCodes.indexOf(code) === -1) {
						return client.emit(
							'error',
							new Error('Wrong reason code for pubrec'),
						)
					}
					if (code) {
						client['_sendPacket'](
							{ cmd: 'pubrec', messageId, reasonCode: code },
							done,
						)
					} else {
						client.incomingStore.put(packet, () => {
							client['_sendPacket'](
								{ cmd: 'pubrec', messageId },
								done,
							)
						})
					}
				},
			)
			break
		}
		case 1: {
			// emit the message event
			options.customHandleAcks(
				topic,
				message as Buffer,
				packet,
				(error, code) => {
					if (typeof error === 'number') {
						code = error
						error = null
					}
					if (error) {
						return client.emit('error', error as Error)
					}
					if (validReasonCodes.indexOf(code) === -1) {
						return client.emit(
							'error',
							new Error('Wrong reason code for puback'),
						)
					}
					if (!code) {
						client.emit('message', topic, message as Buffer, packet)
					}
					client.handleMessage(packet, (err) => {
						if (err) {
							return done && done(err)
						}
						client['_sendPacket'](
							{ cmd: 'puback', messageId, reasonCode: code },
							done,
						)
					})
				},
			)
			break
		}
		case 0:
			// emit the message event
			client.emit('message', topic, message as Buffer, packet)
			client.handleMessage(packet, done)
			break
		default:
			// do nothing
			client.log('handlePublish: unknown QoS. Doing nothing.')
			// log or throw an error about unknown qos
			break
	}
}

export default handlePublish
