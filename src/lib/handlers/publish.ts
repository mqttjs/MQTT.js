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
 * Reject a PUBLISH whose Topic Alias breaks the protocol: tell the application,
 * then tear the connection down so the usual reconnect logic runs.
 *
 * `done` must be called on every exit. It is the writable stream's packet pump
 * callback; skipping it leaves the socket undrained and the client wedged with
 * `connected === true`, no packets flowing and no `close`/`offline` event, so
 * reconnect never fires. It runs after `_cleanUp` so draining cannot feed more
 * of the broker's buffered data into the parser before the teardown. The pump
 * state is scoped to a single `connect()` call, so this `done` cannot reach the
 * pump of the connection the reconnect creates.
 */
const rejectTopicAlias = (
	client: MqttClient,
	message: string,
	done: DoneCallback,
) => {
	client.emit('error', new ErrorWithReasonCode(message, TOPIC_ALIAS_INVALID))
	client['_cleanUp'](true)
	done()
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
						'Received Topic Alias is out of range',
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
				client.log(
					'handlePublish :: topic alias out of range. alias: %d',
					alias,
				)
				rejectTopicAlias(
					client,
					'Received Topic Alias is out of range',
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
