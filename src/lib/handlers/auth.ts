import { type IAuthPacket } from 'mqtt-packet'
import { ErrorWithReasonCode, type PacketHandler } from '../shared'
import { ReasonCodes } from './ack'

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

	if (rc === 0) {
		client._handleReauthCompleted(null, packet)
		return
	}

	client.handleAuth(
		packet,
		(err: ErrorWithReasonCode, packet2: IAuthPacket) => {
			if (err) {
				if (client.connected) client._handleReauthCompleted(err, packet)
				else client.emit('error', err)
				return
			}

			if (rc === 24) {
				client.reconnecting = false
				client['_sendPacket'](packet2)
			} else {
				console.log('### DEBUGGING rc: ', rc, ' ####')
				const error = new ErrorWithReasonCode(
					`Connection refused: ${ReasonCodes[rc]}`,
					rc,
				)
				if (client.connected) {
					client._handleReauthCompleted(error, packet)
				} else {
					client.emit('error', error)
				}
			}
		},
	)
	console.log(
		'DEBUG 3: Finished calling handleAuth (but did the callback run?)',
	)
}

export default handleAuth
