import { assert } from 'chai'
import { Duplex } from 'readable-stream'
import { describe, it } from 'node:test'
import mqtt from '../../src'

function createStream() {
	return new Duplex({
		read() {},
		write(_chunk, _encoding, callback) {
			callback()
		},
	})
}

describe('streamErrorHandler', () => {
	it('should emit errors from packet writes without a code', function _test(t, done) {
		const stream = createStream()
		const client = new mqtt.MqttClient(() => stream, {
			manualConnect: true,
			password: 'secret',
			reconnectPeriod: 0,
		})

		client.once('error', (error) => {
			assert.strictEqual(
				error.message,
				'Username is required to use password',
			)
			assert.isUndefined(error.code)
			client.end(true, (endError) => done(endError))
		})

		client.connect()
	})

	it('should preserve packet write errors on WebSocket streams', function _test(t, done) {
		const client = mqtt.connect({
			protocol: 'ws',
			host: '127.0.0.1',
			port: 1,
			password: 'secret',
			reconnectPeriod: 0,
			connectTimeout: 1000,
		})
		const errors: Error[] = []

		client.on('error', (error) => {
			errors.push(error)
			if (errors.length === 1) {
				setImmediate(() => {
					assert.strictEqual(errors.length, 1)
					assert.strictEqual(
						errors[0].message,
						'Username is required to use password',
					)
					client.end(true, (endError) => done(endError))
				})
			}
		})
	})

	it('should emit packet write errors once on TLS streams', function _test(t, done) {
		const client = mqtt.connect({
			protocol: 'mqtts',
			host: '127.0.0.1',
			port: 1,
			password: 'secret',
			reconnectPeriod: 0,
			connectTimeout: 1000,
		})
		const errors: Error[] = []

		client.on('error', (error) => {
			errors.push(error)
		})
		client.once('close', () => {
			assert.strictEqual(errors.length, 1)
			assert.strictEqual(
				errors[0].message,
				'Username is required to use password',
			)
			client.end(true, (endError) => done(endError))
		})
	})

	it('should keep silent stream destruction silent', function _test(t, done) {
		const stream = createStream()
		const client = new mqtt.MqttClient(() => stream, {
			manualConnect: true,
			reconnectPeriod: 0,
		})
		let errorEvents = 0

		client.on('error', () => {
			errorEvents += 1
		})
		client.once('close', () => {
			assert.strictEqual(errorEvents, 0)
			client.end(true, (endError) => done(endError))
		})

		client.connect()
		stream.destroy()
	})

	it('should keep WebSocket teardown errors silent', function _test(t, done) {
		const stream = createStream()
		const client = new mqtt.MqttClient(() => stream, {
			manualConnect: true,
			reconnectPeriod: 0,
		})
		let errorEvents = 0

		client.on('error', () => {
			errorEvents += 1
		})
		client.once('close', () => {
			assert.strictEqual(errorEvents, 0)
			client.end(true, (endError) => done(endError))
		})

		client.connect()
		stream.destroy(
			new Error(
				'WebSocket was closed before the connection was established',
			),
		)
	})

	it('should keep generic WebSocket errors silent', function _test(t, done) {
		const stream = createStream()
		const client = new mqtt.MqttClient(() => stream, {
			manualConnect: true,
			reconnectPeriod: 0,
		})
		let errorEvents = 0

		client.on('error', () => {
			errorEvents += 1
		})
		client.once('close', () => {
			assert.strictEqual(errorEvents, 0)
			client.end(true, (endError) => done(endError))
		})

		client.connect()
		stream.destroy(new Error('WebSocket error'))
	})
})
