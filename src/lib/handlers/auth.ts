import { type IAuthPacket } from 'mqtt-packet'
import { ErrorWithReasonCode, type PacketPump } from '../shared'
import type MqttClient from '../client'

/** MQTT 5 reason code 0x82 */
const PROTOCOL_ERROR = 130

/**
 * Drops the connection on an AUTH exchange that cannot go on, and tells the
 * application why. Emitting `error` alone leaves a hostile broker free to keep
 * sending on a socket whose connack timer is already cleared, and `end()` would
 * clear the reconnect timer and make the teardown permanent, so use `_cleanUp`.
 *
 * The teardown runs before the `emit`: a directly constructed `MqttClient` has
 * no default `error` listener (only `mqtt.connect()` attaches one) and an
 * application listener may throw, and either way the throw would otherwise skip
 * the teardown and leave the wedged socket behind.
 *
 * The parsed-but-unhandled rest of the current chunk goes first: a single TCP
 * chunk is parsed in full before its first packet is handled, so without this
 * the packets an attacker packed behind the offending AUTH would still be run
 * against the stream we just destroyed.
 */
const rejectAuth = (
	client: MqttClient,
	error: ErrorWithReasonCode,
	pump?: PacketPump,
) => {
	client.log('handleAuth :: %s', error.message)
	pump?.discardParsedPackets()
	// `client.handleAuth` is application-overridable and answers through a
	// callback, so this can run long after the AUTH was parsed -- an
	// implementation that fetches a token has every reason to be slow. By then
	// the client may be on a later connection, and tearing down would destroy a
	// healthy stream over an exchange that belongs to a dead one. No pump means
	// the handler ran outside the packet pump, where there is no later
	// connection to protect.
	if (!pump || pump.isCurrent()) {
		client['_cleanUp'](true)
	}
	client.emit('error', error)
}

// No pump callback here either: see the note in `connack.ts`.
const handleAuth = (
	client: MqttClient,
	// `returnCode` is the MQTT 3 spelling; mqtt-packet does not declare it on
	// `IAuthPacket` because an AUTH packet only exists in MQTT 5 to begin with.
	packet: IAuthPacket & { returnCode?: number },
	pump?: PacketPump,
) => {
	const { options } = client
	const version = options.protocolVersion
	const rc = version === 5 ? packet.reasonCode : packet.returnCode

	if (version !== 5) {
		rejectAuth(
			client,
			new ErrorWithReasonCode(
				`Protocol error: Auth packets are only supported in MQTT 5. Your version:${version}`,
				PROTOCOL_ERROR,
			),
			pump,
		)
		return
	}

	// What this connection actually offered in CONNECT, not what `options` says
	// now: a caller mutating it mid-exchange must not move the goalposts.
	const authenticationMethod = client['_authenticationMethod']

	// MQTT-4.12.0-6: the broker must not send AUTH when the client did not
	// offer an Authentication Method in CONNECT, so an AUTH outside an
	// enhanced authentication exchange is a protocol violation.
	if (!authenticationMethod) {
		rejectAuth(
			client,
			new ErrorWithReasonCode(
				'Protocol error: Auth packet received but enhanced authentication was not requested',
				PROTOCOL_ERROR,
			),
			pump,
		)
		return
	}

	// MQTT-4.12.0-3: the Authentication Method has to stay the one sent in
	// CONNECT. Without this a broker can switch it mid-exchange and steer a
	// custom `handleAuth` down a weaker path.
	if (packet.properties?.authenticationMethod !== authenticationMethod) {
		rejectAuth(
			client,
			new ErrorWithReasonCode(
				`Protocol error: Auth packet Authentication Method does not match the "${authenticationMethod}" sent in CONNECT`,
				PROTOCOL_ERROR,
			),
			pump,
		)
		return
	}

	client.handleAuth(
		packet,
		(err: ErrorWithReasonCode, packet2: IAuthPacket) => {
			if (err) {
				// `handleAuth` refused the broker's packet, so the exchange
				// cannot go on. The connack timer is already cleared, so the
				// socket has to go down with the error.
				rejectAuth(client, err, pump)
				return
			}

			// MQTT 5 3.15.2.1: reason code 0 on AUTH means the broker accepted
			// the authentication. It ends a re-authentication the client asked
			// for, there is nothing left to send, and the connection stays up.
			if (rc === 0) {
				client.log(
					'handleAuth :: authentication exchange completed successfully',
				)
				return
			}

			if (rc === 24) {
				if (!packet2) {
					// `handleAuth` completed without a packet (the default
					// implementation does), so there is nothing to continue the
					// exchange with. The connack timer is already cleared, so
					// leaving the socket up would just hang the client.
					rejectAuth(
						client,
						new ErrorWithReasonCode(
							'Protocol error: No auth packet to continue the authentication exchange',
							PROTOCOL_ERROR,
						),
						pump,
					)
					return
				}

				client.reconnecting = false
				client['_sendPacket'](packet2)
				return
			}

			// MQTT 5 3.15.2.1 defines exactly three AUTH reason codes: 0 and
			// 24, both handled above, and 25 "Re-authenticate", which only a
			// client may send. Anything left is the broker breaking the
			// protocol, not refusing the connection with a reason.
			rejectAuth(
				client,
				new ErrorWithReasonCode(
					`Protocol error: Auth packet reason code ${rc} is not one a broker may send`,
					PROTOCOL_ERROR,
				),
				pump,
			)
		},
	)
}

export default handleAuth
