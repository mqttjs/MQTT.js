import { type IAuthPacket } from 'mqtt-packet'
import { ErrorWithReasonCode, type PacketHandler } from '../shared'
import { ReasonCodes } from './ack'

const RC_SUCCESS = 0x00
const RC_CONTINUE_AUTHENTICATION = 0x18
const RC_PROTOCOL_ERROR = 0x82

const handleAuth: PacketHandler = (
	client,
	packet: IAuthPacket & { returnCode: number },
) => {
	const { options } = client
	const version = options.protocolVersion
	const rc = version === 5 ? packet.reasonCode : packet.returnCode

	client.log('handleAuth :: received AUTH packet, reason code %d', rc)

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
		client.handleAuth(
			packet,
			(err: ErrorWithReasonCode, packet2: IAuthPacket) => {
				if (err) {
					client.emit('error', err)
					return
				}

				if (rc === RC_CONTINUE_AUTHENTICATION) {
					client.reconnecting = false
					client['_sendPacket'](packet2)
				} else {
					const error = new ErrorWithReasonCode(
						`Connection refused: ${ReasonCodes[rc]}`,
						rc,
					)
					client.emit('error', error)
				}
			},
		)
		return
	}

	// Re-authentication (MQTT 5.0 spec, section 4.12.1): the exchange can only
	// be started by the client, so an AUTH packet received while no
	// re-authentication is in progress is a protocol error.
	if (!client['_reauthPending']) {
		client.log(
			'handleAuth :: unexpected AUTH packet while no re-authentication is in progress',
		)
		client.emit(
			'error',
			new ErrorWithReasonCode(
				'Protocol error: received AUTH packet while no re-authentication is in progress',
				RC_PROTOCOL_ERROR,
			),
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
			client.handleAuth(
				packet,
				(err: ErrorWithReasonCode, packet2: IAuthPacket) => {
					if (err) {
						client.log('handleAuth :: client.handleAuth() failed')
						client['_finishReauth'](err)
						return
					}

					if (!packet2) {
						client['_finishReauth'](
							new ErrorWithReasonCode(
								'Re-authentication failed: client.handleAuth() did not provide an AUTH packet to continue the exchange',
								rc,
							),
						)
						return
					}

					client.log('handleAuth :: sending next AUTH packet')
					client['_sendPacket'](packet2, (sendErr) => {
						if (sendErr) {
							client.log(
								'handleAuth :: failed to send next AUTH packet',
							)
							client['_finishReauth'](sendErr)
						}
					})
				},
			)
			break

		default:
			// An AUTH packet can only carry 0x00, 0x18 or 0x19, so this is
			// always 0x19: a broker must never ask a client to re-authenticate.
			client.log(
				'handleAuth :: unexpected AUTH reason code %d from broker',
				rc,
			)
			client['_finishReauth'](
				new ErrorWithReasonCode(
					`Protocol error: unexpected AUTH reason code ${rc} received from the broker`,
					rc,
				),
			)
			break
	}
}

export default handleAuth
