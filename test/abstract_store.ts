import { IPublishPacket, IPubrelPacket } from 'mqtt-packet'
import { IStore } from '../src/lib/store'
import 'should'

export default function abstractStoreTest(
	build: (cb: (err?: Error, store?: IStore) => void) => void,
) {
	let store: IStore

	// eslint-disable-next-line
	beforeEach(function (done) {
		build((err, _store) => {
			store = _store
			done(err)
		})
	})

	afterEach(function test(done) {
		store.close(done)
	})

	it('should put and stream in-flight packets', function test(done) {
		const packet: IPublishPacket = {
			topic: 'hello',
			payload: 'world',
			qos: 1,
			messageId: 42,
			cmd: 'publish',
			dup: false,
			retain: false,
		}

		store.put(packet, () => {
			store.createStream().on('data', (data) => {
				data.should.eql(packet)
				done()
			})
		})
	})

	it('should support destroying the stream', function test(done) {
		const packet: IPublishPacket = {
			topic: 'hello',
			payload: 'world',
			qos: 1,
			messageId: 42,
			cmd: 'publish',
			dup: false,
			retain: false,
		}

		store.put(packet, () => {
			const stream = store.createStream()
			stream.on('close', done)
			stream.destroy()
		})
	})

	it('should add and del in-flight packets', function test(done) {
		const packet: IPublishPacket = {
			topic: 'hello',
			payload: 'world',
			qos: 1,
			messageId: 42,
			cmd: 'publish',
			dup: false,
			retain: false,
		}

		store.put(packet, () => {
			store.del(packet, () => {
				store
					.createStream()
					.on('data', () => {
						done(new Error('this should never happen'))
					})
					.on('end', done)
			})
		})
	})

	it('should replace a packet when doing put with the same messageId', function test(done) {
		const packet1: IPublishPacket = {
			cmd: 'publish', // added
			topic: 'hello',
			payload: 'world',
			qos: 2,
			messageId: 42,
			dup: false,
			retain: false,
		}
		const packet2: IPubrelPacket = {
			cmd: 'pubrel', // added
			// qos: 2,
			messageId: 42,
		}

		store.put(packet1, () => {
			store.put(packet2, () => {
				store.createStream().on('data', (data) => {
					data.should.eql(packet2)
					done()
				})
			})
		})
	})

	it('should return the original packet on del', function test(done) {
		const packet: IPublishPacket = {
			topic: 'hello',
			payload: 'world',
			qos: 1,
			messageId: 42,
			cmd: 'publish',
			dup: false,
			retain: false,
		}

		store.put(packet, () => {
			store.del({ messageId: 42 }, (err, deleted) => {
				if (err) {
					throw err
				}
				deleted.should.eql(packet)
				done()
			})
		})
	})

	it('should get a packet with the same messageId', function test(done) {
		const packet: IPublishPacket = {
			topic: 'hello',
			payload: 'world',
			qos: 1,
			messageId: 42,
			cmd: 'publish',
			dup: false,
			retain: false,
		}

		store.put(packet, () => {
			store.get({ messageId: 42 }, (err, fromDb) => {
				if (err) {
					throw err
				}
				fromDb.should.eql(packet)
				done()
			})
		})
	})
}
