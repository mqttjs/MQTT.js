import { assert } from 'chai'
import { Duplex } from 'readable-stream'
import { describe, it } from 'node:test'
import mqtt from '../../src'

function openDuplex() {
	return new Duplex({
		read(n) {},
		write(_chunk, _enc, cb) {
			cb()
		},
	})
}

describe('streamErrorHandler', () => {
	it('should emit error when connecting with a password but no username', function _test(t, done) {
		const client = mqtt.connect({
			host: '127.0.0.1',
			port: 1883,
			password: 'secret',
			reconnectPeriod: 0,
			connectTimeout: 1000,
		})
		client.on('connect', () => {
			done(new Error('Should not emit connect'))
		})
		client.on('error', (err) => {
			assert.strictEqual(
				err.message,
				'Username is required to use password',
			)
			assert.isUndefined((err as Error & { code?: string }).code)
			client.end(true, (endErr) => done(endErr))
		})
	})

	it('should emit error when the stream is destroyed with a message and no code', function _test(t, done) {
		const duplex = openDuplex()
		const client = new mqtt.MqttClient(() => duplex, {
			manualConnect: true,
			reconnectPeriod: 0,
			connectTimeout: 1000,
		})
		client.on('error', (err) => {
			assert.strictEqual(
				err.message,
				'Username is required to use password',
			)
			assert.isUndefined((err as Error & { code?: string }).code)
			client.end(true, (endErr) => done(endErr))
		})
		client.connect()
		duplex.destroy(new Error('Username is required to use password'))
	})

	it('should not emit error when the stream is destroyed without an error', function _test(t, done) {
		const duplex = openDuplex()
		const client = new mqtt.MqttClient(() => duplex, {
			manualConnect: true,
			reconnectPeriod: 0,
			connectTimeout: 1000,
		})
		let sawError = false
		client.on('error', () => {
			sawError = true
		})
		client.on('close', () => {
			assert.isFalse(sawError)
			client.end(true, (endErr) => done(endErr))
		})
		client.connect()
		duplex.destroy()
	})

	it('should not emit error for websocket-closed-before-open teardown', function _test(t, done) {
		const duplex = openDuplex()
		const client = new mqtt.MqttClient(() => duplex, {
			manualConnect: true,
			reconnectPeriod: 0,
			connectTimeout: 1000,
		})
		let sawError = false
		client.on('error', () => {
			sawError = true
		})
		client.on('close', () => {
			assert.isFalse(sawError)
			client.end(true, (endErr) => done(endErr))
		})
		client.connect()
		duplex.destroy(
			new Error(
				'WebSocket was closed before the connection was established',
			),
		)
	})
})
