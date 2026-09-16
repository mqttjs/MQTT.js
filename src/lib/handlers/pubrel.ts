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

	const comp: IPubcompPacket = { cmd: 'pubcomp', messageId }

	client.incomingStore.get(packet, (err, pub: IPublishPacket) => {
		if (!err) {
			client.emit('message', pub.topic, pub.payload as Buffer, pub)
			client.handleMessage(pub, (err2) => {
				if (err2) {
					// Keep the packet in the incoming store and send no PUBCOMP: the
					// broker retransmits the PUBREL and the application gets another
					// chance to handle the message. Its Receive Maximum slot stays
					// taken too, so the quota keeps bounding the store.
					return callback(err2)
				}
				client.incomingStore.del(pub, client.noop)
				client['_releaseIncomingQoS2Publish'](messageId)
				client['_sendPacket'](comp, callback)
			})
		} else {
			// No slot is released here. `IStore.get` reports "not found" and a
			// transient read failure the same way, and freeing a slot whose
			// entry is still in the store would break the quota it is meant to
			// enforce. Nothing is lost: a slot is only taken alongside a store
			// entry and released when that entry is deleted, so by the time a
			// PUBREL finds nothing stored - a duplicate, or an id that was never
			// published - its slot is already gone.
			client['_sendPacket'](comp, callback)
		}
	})
}

export default handlePubrel
