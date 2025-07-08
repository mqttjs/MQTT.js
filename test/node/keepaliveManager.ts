import { afterEach, beforeEach, describe, it } from 'node:test'
import { assert } from 'chai'
import { useFakeTimers, spy, stub } from 'sinon'
import { type MqttClient } from 'src'
import KeepaliveManager from '../../src/lib/KeepaliveManager'

function mockedClient(keepalive: number) {
	return {
		options: {
			keepalive,
		},
		onKeepaliveTimeout: () => {},
		sendPing: () => {},
		log: () => {},
	} as unknown as MqttClient
}

describe('KeepaliveManager', () => {
	let clock: sinon.SinonFakeTimers
	beforeEach(() => {
		clock = useFakeTimers()
	})

	afterEach(() => {
		clock.restore()
	})

	it('should schedule and destroy', () => {
		const keepalive = 10 // seconds
		const client = mockedClient(keepalive)
		const manager = new KeepaliveManager(client, 'auto')

		const spySendPing = spy(client, 'sendPing')
		const spyTimeout = spy(client, 'onKeepaliveTimeout')

		const checksEvery = manager.intervalEvery

		assert.ok(manager['timerId'], 'timer should be created automatically')

		clock.tick(checksEvery)
		assert.equal(
			spySendPing.callCount,
			0,
			'should not send ping before keepalive seconds',
		)

		clock.tick(checksEvery)
		assert.equal(spySendPing.callCount, 1, 'should send ping automatically')
		assert.equal(spyTimeout.callCount, 0, 'should not trigger timeout')

		clock.tick(checksEvery)
		assert.equal(
			spyTimeout.callCount,
			1,
			'should trigger keepalive timeout after 1.5*keepalive seconds',
		)

		manager.destroy()
		assert.ok(
			!manager['timerId'],
			'timer should not exists after destroy()',
		)

		assert.ok(
			manager['destroyed'],
			'timer should have `destroyed` set to true after destroy()',
		)
	})

	it('should reschedule', () => {
		const keepalive = 10 // seconds
		const manager = new KeepaliveManager(mockedClient(keepalive), 'auto')

		const checksEvery = manager.intervalEvery

		clock.tick(checksEvery)
		assert.equal(
			manager['counter'],
			1,
			'should increese counter on every check',
		)
		manager.reschedule()
		assert.equal(
			manager['counter'],
			0,
			'should reset counter after reschedule',
		)
	})

	it('should validate keepalive', () => {
		const manager = new KeepaliveManager(mockedClient(1), 'auto')

		assert.throw(
			() => manager.setKeepalive(-1),
			'Keepalive value must be an integer between 0 and 2147483647. Provided value is -1',
		)

		assert.throw(
			() => manager.setKeepalive(2147483648),
			'Keepalive value must be an integer between 0 and 2147483647. Provided value is 2147483648',
		)

		manager.setKeepalive(10)

		assert.equal(manager.keepalive, 10000)
		assert.equal(manager.intervalEvery, 5000)
	})

	it('should use provided Timer object', () => {
		const keepalive = 10 // seconds
		const customTimer = {
			set: stub().returns(123),
			clear: stub(),
		}
		const manager = new KeepaliveManager(
			mockedClient(keepalive),
			customTimer,
		)
		assert.equal(manager['timer'], customTimer)
		assert.equal(customTimer.set.callCount, 1)
		assert.equal(manager['timerId'], 123)

		manager.destroy()
		assert.equal(customTimer.clear.called, true)
	})
})
