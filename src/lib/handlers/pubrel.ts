import {
	type IPubcompPacket,
	type IPublishPacket,
	type IPubrelPacket,
} from 'mqtt-packet'
import { type PacketHandler } from '../shared'

const handlePubrel: PacketHandler = (client, packet: IPubrelPacket, done) => {
	client.log('handling pubrel packet')
	const callback = typeof done !== 'undefined' ? done : client.noop
	const { messageId } = packet

	// @ts-expect-error - here the Packet union type declares that messageId can be undefined. This can be resolved by a type guard but will change to logic of the code.
	const comp: IPubcompPacket = { cmd: 'pubcomp', messageId }

	// @ts-expect-error - The problem here revolves more around the IStore.get method signature which indicates that the second argument of the callback can be undefined.
	client.incomingStore.get(packet, (err, pub: IPublishPacket) => {
		if (!err) {
			client.emit('message', pub.topic, pub.payload as Buffer, pub)
			client.handleMessage(pub, (err2) => {
				if (err2) {
					return callback(err2)
				}
				client.incomingStore.del(pub, client.noop)
				client['_sendPacket'](comp, callback)
			})
		} else {
			client['_sendPacket'](comp, callback)
		}
	})
}

export default handlePubrel
