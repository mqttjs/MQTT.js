import { type IConnackPacket } from 'mqtt-packet'
import { ReasonCodes } from './ack'
import TopicAliasSend from '../topic-alias-send'
import { ErrorWithReasonCode, type PacketPump } from '../shared'
import type MqttClient from '../client'

// The pump callback is not among the arguments on purpose: `handlers/index.ts`
// calls it once this handler returns, in a `finally`, so every path here is
// covered including the ones that emit and throw.
const handleConnack = (
	client: MqttClient,
	packet: IConnackPacket,
	pump?: PacketPump,
) => {
	client.log('_handleConnack')
	const { options } = client
	const version = options.protocolVersion
	const rc = version === 5 ? packet.reasonCode : packet.returnCode

	// [MQTT-3.2.0-2] the server must not send more than one CONNACK per network
	// connection: re-running `_onConnect` on a live session would reset the
	// message id state and resend still unacked messages with their original ids.
	// The gate is "a CONNACK was already handled on this connection", not
	// `client.connected`: a refused CONNACK never sets `connected`, so a broker
	// could otherwise follow a refusal with an accepting CONNACK -- in the same
	// chunk, ahead of the teardown below -- and get a connected client the
	// application already treated as failed.
	if (client['connackReceived']) {
		const err = new ErrorWithReasonCode(
			'Protocol error: duplicate CONNACK on the same network connection',
			130,
		)
		// Drop the rest of the chunk, then tear down, then emit. The order is
		// load-bearing on every step:
		//
		// - `_write` parses a whole TCP chunk into the pump's queue before the
		//   first packet is handled, so the queue still holds packets from a
		//   broker we just declared in violation. `handlers/index.ts` calls the
		//   pump callback once this handler returns, so without the discard the
		//   attacker's `[CONNACK][CONNACK][PUBLISH]` chunk still delivers its
		//   PUBLISHes: `message` events after `close`, `incomingStore` entries
		//   nothing will ever ack, and PUBACK/PUBREC writes to a destroyed
		//   stream. Discarding first is also what keeps the closure we empty
		//   the one we are abandoning -- `_cleanUp` runs user callbacks that
		//   can re-enter `connect()`, which replaces the client's current pump.
		// - `_cleanUp` runs before the `emit`. `emit('error')` throws
		//   synchronously when nothing is listening -- `mqtt.connect()`
		//   attaches a no-op listener but a directly constructed `MqttClient`
		//   has none -- and an application handler may throw too. Either way
		//   the teardown would be skipped and the connection would stay up with
		//   the duplicate CONNACK unrejected.
		//
		// Closing the network connection is safe: the reconnect logic opens a
		// new one and both stores survive it, so the session is resumed, not
		// cleared.
		pump?.discardParsedPackets()
		client['_cleanUp'](true)
		client.emit('error', err)
		return
	}
	client['connackReceived'] = true

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
				// Unreachable over the wire: mqtt-packet parses
				// topicAliasMaximum as a uint16. Without the teardown the
				// client would wedge here for good -- the connack timer is
				// already cleared and `connackReceived` latched, so no later
				// CONNACK and no timeout can move it on. Discard and tear down
				// first, for the same reasons as the duplicate CONNACK above.
				pump?.discardParsedPackets()
				client['_cleanUp'](true)
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
		// A refused CONNACK always tears the connection down. Leaving the
		// socket open -- what happened whenever `reconnectOnConnackError` was
		// off, which is the default -- left a client with the connack timer
		// already cleared, no keepalive manager (it never became `connected`)
		// and no reconnect armed, while the broker kept streaming: its
		// PUBLISHes were delivered as `message` events to an application that
		// had just been told "Connection refused".
		pump?.discardParsedPackets()
		// Neither `_cleanUp` nor the `close` handler may arm the retry here:
		// it is armed below instead, after the `error`, so that applications
		// that already set `reconnectOnConnackError` keep seeing `error`,
		// `offline`, `close` in that order.
		client['reconnectSuppressed'] = true
		client['_cleanUp'](true)
		try {
			client.emit('error', err)
		} finally {
			// `reconnectOnConnackError` gates the retry, not the teardown --
			// which is what its name says. In a `finally` so that an
			// application `error` handler that throws cannot leave the retry
			// disarmed for good.
			if (options.reconnectOnConnackError) {
				client['reconnectSuppressed'] = false
				client['_setupReconnect']()
			}
		}
	}
}

export default handleConnack
