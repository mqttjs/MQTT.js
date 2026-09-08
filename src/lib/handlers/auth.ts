import { type IAuthPacket } from 'mqtt-packet'
import { ErrorWithReasonCode, type PacketHandler } from '../shared'
import { reasonCodeText } from './ack'

export const RC_SUCCESS = 0x00
export const RC_CONTINUE_AUTHENTICATION = 0x18
export const RC_REAUTHENTICATE = 0x19
export const RC_PROTOCOL_ERROR = 0x82
export const RC_BAD_AUTHENTICATION_METHOD = 0x8c

/**
 * Hand an AUTH packet to `client.handleAuth()` and send the packet it provides.
 * Shared by the pre-CONNACK exchange and the re-authentication exchange, which
 * differ only in where a failure is reported: that is `onError`.
 */
const continueAuth = (
	client: Parameters<PacketHandler>[0],
	packet: IAuthPacket,
	rc: number,
	onError: (err: Error) => void,
) => {
	client.handleAuth(
		packet,
		(err: ErrorWithReasonCode, packet2: IAuthPacket) => {
			if (err) {
				client.log('handleAuth :: client.handleAuth() failed')
				onError(err)
				return
			}

			if (!packet2) {
				onError(
					new ErrorWithReasonCode(
						'Authentication failed: client.handleAuth() did not provide an AUTH packet to continue the exchange',
						rc,
					),
				)
				return
			}

			client.log('handleAuth :: sending next AUTH packet')
			client['_sendPacket'](packet2, (sendErr) => {
				if (sendErr) {
					client.log('handleAuth :: failed to send next AUTH packet')
					onError(sendErr)
				}
			})
		},
	)
}

const handleAuth: PacketHandler = (
	client,
	packet: IAuthPacket & { returnCode: number },
) => {
	const { options } = client
	const version = options.protocolVersion
	const rc = version === 5 ? packet.reasonCode : packet.returnCode

	client.log(
		'handleAuth :: received AUTH packet, reason code 0x%s',
		Number(rc).toString(16),
	)

	if (version !== 5) {
		const err = new ErrorWithReasonCode(
			`Protocol error: Auth packets are only supported in MQTT 5. Your version:${version}`,
			rc,
		)
		client.emit('error', err)
		return
	}

	if (!client.connected) {
		// Enhanced authentication exchange during connection (before CONNACK)
		client.log('handleAuth :: enhanced authentication during connect')

		if (rc !== RC_CONTINUE_AUTHENTICATION) {
			client.emit(
				'error',
				new ErrorWithReasonCode(
					`Connection refused: ${reasonCodeText(rc)}`,
					rc,
				),
			)
			return
		}

		client.reconnecting = false
		continueAuth(client, packet, rc, (err) => {
			client.emit('error', err)
		})
		return
	}

	// Re-authentication (MQTT 5.0 spec, section 4.12.1): the exchange can only
	// be started by the client, so an AUTH packet received while no
	// re-authentication is in progress is a protocol error.
	if (!client['_reauthPending']) {
		client.log(
			'handleAuth :: unexpected AUTH packet while no re-authentication is in progress',
		)
		client['_onProtocolError'](
			new ErrorWithReasonCode(
				'Protocol error: received AUTH packet while no re-authentication is in progress',
				RC_PROTOCOL_ERROR,
			),
		)
		return
	}

	// [MQTT-4.12.0-5]: every AUTH packet of an exchange carries the
	// authentication method of the CONNECT packet. Enforce it here so a broker
	// cannot steer client.handleAuth() onto a method the client never agreed to.
	const negotiated = options.properties?.authenticationMethod
	const received = packet.properties?.authenticationMethod
	if (received !== negotiated) {
		client.log(
			'handleAuth :: authentication method mismatch, expected %s got %o',
			negotiated,
			received,
		)
		client['_finishReauth'](
			new ErrorWithReasonCode(
				`Bad authentication method: the broker answered with '${received}' instead of the negotiated '${negotiated}'`,
				RC_BAD_AUTHENTICATION_METHOD,
			),
			packet,
		)
		return
	}

	switch (rc) {
		case RC_SUCCESS:
			client.log('handleAuth :: re-authentication succeeded')
			client['_finishReauth'](null, packet)
			break

		case RC_CONTINUE_AUTHENTICATION:
			client.log(
				'handleAuth :: re-authentication continues, calling client.handleAuth()',
			)
			// A multi-round exchange must not run past its deadline just
			// because it started in time, and an unbounded number of rounds is
			// work the broker can force on the client.
			if (!client['_startReauthRound']()) {
				break
			}
			continueAuth(client, packet, rc, (err) => {
				client['_finishReauth'](err, packet)
			})
			break

		default:
			// An AUTH packet can only carry 0x00, 0x18 or 0x19, so this is
			// always 0x19: a broker must never ask a client to re-authenticate.
			client.log(
				'handleAuth :: unexpected AUTH reason code 0x%s from broker',
				Number(rc).toString(16),
			)
			client['_finishReauth'](
				new ErrorWithReasonCode(
					`Protocol error: unexpected AUTH reason code ${rc} received from the broker`,
					rc,
				),
				packet,
			)
			break
	}
}

export default handleAuth
