import { type IAuthPacket } from 'mqtt-packet'
import { ErrorWithReasonCode, type PacketHandler } from '../shared'
import { ReasonCodes } from './ack'

const RC_SUCCESS = 0x00
const RC_CONTINUE = 0x18

const handleAuth: PacketHandler = (
	client,
	packet: IAuthPacket & { returnCode: number },
) => {
	const { options } = client
	const version = options.protocolVersion
	const rc = version === 5 ? packet.reasonCode : packet.returnCode

	if (version !== 5) {
		const err = new ErrorWithReasonCode(
			`Protocol error: Auth packets are only supported in MQTT 5. Your version:${version}`,
			rc,
		)
		client.emit('error', err)
		return
	}

	const continueAuth = () => {
		client.handleAuth(packet, (err, nextPacket) => {
			if (err) {
				client.emit('error', err)
				return
			}

			if (!nextPacket) {
				client.emit(
					'error',
					new ErrorWithReasonCode(
						'AUTH handler did not return a packet',
						rc,
					),
				)
				return
			}

			client['_sendPacket'](nextPacket)
		})
	}

	if (!client.connected) {
		if (rc !== RC_CONTINUE) {
			client.emit(
				'error',
				new ErrorWithReasonCode(
					`Connection refused: ${ReasonCodes[rc]}`,
					rc,
				),
			)
			return
		}

		continueAuth()
		return
	}

	switch (rc) {
		case RC_SUCCESS:
			return client._finishReauth(null, packet)

		case RC_CONTINUE:
			return continueAuth()

		default:
			return client._finishReauth(
				new ErrorWithReasonCode(
					`Re-auth failed: ${ReasonCodes[rc]}`,
					rc,
				),
				packet,
			)
	}
}

export default handleAuth
