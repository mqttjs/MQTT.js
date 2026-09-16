// Other Socket Errors: EADDRINUSE, ECONNRESET, ENOTFOUND, ETIMEDOUT.

import { type Packet } from 'mqtt-packet'
import { type PacketHandler, ErrorWithReasonCode } from '../shared'

export const ReasonCodes = {
	0: '',
	1: 'Unacceptable protocol version',
	2: 'Identifier rejected',
	3: 'Server unavailable',
	4: 'Bad username or password',
	5: 'Not authorized',
	16: 'No matching subscribers',
	17: 'No subscription existed',
	128: 'Unspecified error',
	129: 'Malformed Packet',
	130: 'Protocol Error',
	131: 'Implementation specific error',
	132: 'Unsupported Protocol Version',
	133: 'Client Identifier not valid',
	134: 'Bad User Name or Password',
	135: 'Not authorized',
	136: 'Server unavailable',
	137: 'Server busy',
	138: 'Banned',
	139: 'Server shutting down',
	140: 'Bad authentication method',
	141: 'Keep Alive timeout',
	142: 'Session taken over',
	143: 'Topic Filter invalid',
	144: 'Topic Name invalid',
	145: 'Packet identifier in use',
	146: 'Packet Identifier not found',
	147: 'Receive Maximum exceeded',
	148: 'Topic Alias invalid',
	149: 'Packet too large',
	150: 'Message rate too high',
	151: 'Quota exceeded',
	152: 'Administrative action',
	153: 'Payload format invalid',
	154: 'Retain not supported',
	155: 'QoS not supported',
	156: 'Use another server',
	157: 'Server moved',
	158: 'Shared Subscriptions not supported',
	159: 'Connection rate exceeded',
	160: 'Maximum connect time',
	161: 'Subscription Identifiers not supported',
	162: 'Wildcard Subscriptions not supported',
}

/**
 * The requests that can be pending on a message id in `client.outgoing`.
 * A PUBREL gets one of its own because the outgoing store replays it on
 * reconnect, on an id whose PUBLISH is already done with.
 */
export type PendingCommand = 'publish' | 'pubrel' | 'subscribe' | 'unsubscribe'

/**
 * The acks that answer each pending request. An ack of any other type carries
 * the message id of a request it cannot be an answer to. A QoS 2 PUBLISH stays
 * pending across both of its acks, so it accepts PUBREC and PUBCOMP; a QoS 1
 * one only ever sees the PUBACK.
 */
const acksForPendingCmd: Record<PendingCommand, Packet['cmd'][]> = {
	publish: ['puback', 'pubrec', 'pubcomp'],
	pubrel: ['pubcomp'],
	subscribe: ['suback'],
	unsubscribe: ['unsuback'],
}

const handleAck: PacketHandler = (client, packet) => {
	/* eslint no-fallthrough: "off" */
	const { messageId } = packet
	const type = packet.cmd
	let response = null
	const pending = client.outgoing[messageId]
	const cb = pending ? pending.cb : null
	let err = null

	// Checking `!cb` happens to work, but it's not technically "correct".
	//
	// Why? client code assumes client "no callback" is the same as client "we're not
	// waiting for responses" (puback, pubrec, pubcomp, suback, or unsuback).
	//
	// It would be better to check `if (!client.outgoing[messageId])` here, but
	// there's no reason to change it and risk (another) regression.
	//
	// The only reason client code works is becaues code in MqttClient.publish,
	// MqttClinet.subscribe, and MqttClient.unsubscribe ensures client we will
	// have a callback even if the user doesn't pass one in.)
	if (!cb) {
		client.log('_handleAck :: Server sent an ack in error. Ignoring.')
		// Server sent an ack in error, ignore it.
		return
	}

	// An ack answers the request that allocated its message id and nothing
	// else. `client.outgoing` is keyed by id alone, so without this check a
	// SUBACK carrying a pending PUBLISH's id ran the suback branch below: it
	// freed the id and called the application's publish callback -- reporting
	// a QoS 1/2 publish as delivered, or failing it with `Subscribe error` --
	// while never calling `outgoingStore.del`, so the entry was left behind to
	// be replayed on every reconnect and the freed id let the next publish's
	// `outgoingStore.put` overwrite it. Every pairing is the same bug: a
	// PUBREC for a pending SUBSCRIBE writes a PUBREL under a subscribe's id
	// and leaves its promise pending for good.
	//
	// A mismatched ack is dropped, not turned into a failure of the pending
	// request and not a reason to close the connection. Dropping touches no
	// state, which is what makes the whole matrix safe at once; failing the
	// request would tell the application a publish failed that the broker may
	// be about to acknowledge, and would free its id and store entry on the
	// way. `handleAck` already drops an ack whose message id it knows nothing
	// about, a few lines up.
	if (!acksForPendingCmd[pending.cmd]?.includes(type)) {
		client.log(
			'_handleAck :: %s does not answer the pending %s on message id %d. Ignoring.',
			type,
			pending.cmd,
			messageId,
		)
		client.emit(
			'error',
			new Error(
				`Protocol error: ${type} does not answer the ${pending.cmd} pending on message id ${messageId}`,
			),
		)
		return
	}

	// Process
	client.log('_handleAck :: packet type', type)
	switch (type) {
		case 'pubcomp':
		// same thing as puback for QoS 2
		case 'puback': {
			const pubackRC = packet.reasonCode
			// Callback - we're done
			if (pubackRC && pubackRC > 0 && pubackRC !== 16) {
				err = new ErrorWithReasonCode(
					`Publish error: ${ReasonCodes[pubackRC]}`,
					pubackRC,
				)
				client['_removeOutgoingAndStoreMessage'](messageId, () => {
					cb(err, packet)
				})
			} else {
				client['_removeOutgoingAndStoreMessage'](messageId, cb)
			}

			break
		}
		case 'pubrec': {
			response = {
				cmd: 'pubrel',
				qos: 2,
				messageId,
			}
			const pubrecRC = packet.reasonCode

			if (pubrecRC && pubrecRC > 0 && pubrecRC !== 16) {
				err = new ErrorWithReasonCode(
					`Publish error: ${ReasonCodes[pubrecRC]}`,
					pubrecRC,
				)
				client['_removeOutgoingAndStoreMessage'](messageId, () => {
					cb(err, packet)
				})
			} else {
				client['_sendPacket'](response)
			}
			break
		}
		case 'suback': {
			delete client.outgoing[messageId]
			client.messageIdProvider.deallocate(messageId)
			const granted = packet.granted as number[]
			for (let grantedI = 0; grantedI < granted.length; grantedI++) {
				const subackRC = granted[grantedI]
				if ((subackRC & 0x80) !== 0) {
					err = new Error(`Subscribe error: ${ReasonCodes[subackRC]}`)
					err.code = subackRC

					// suback with Failure status
					const topics = client.messageIdToTopic[messageId]
					if (topics) {
						topics.forEach((topic) => {
							delete client['_resubscribeTopics'][topic]
						})
					}
				}
			}
			delete client.messageIdToTopic[messageId]
			client['_invokeStoreProcessingQueue']()
			cb(err, packet)
			break
		}
		case 'unsuback': {
			delete client.outgoing[messageId]
			client.messageIdProvider.deallocate(messageId)
			client['_invokeStoreProcessingQueue']()
			cb(null, packet)
			break
		}
		default:
			client.emit('error', new Error('unrecognized packet type'))
	}

	if (client.disconnecting && Object.keys(client.outgoing).length === 0) {
		client.emit('outgoingEmpty')
	}
}

export default handleAck
