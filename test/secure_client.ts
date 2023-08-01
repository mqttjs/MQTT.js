import path from 'path'
import fs from 'fs'
import * as mqtt from '../src/mqtt'
import abstractClientTests from './abstract_client'
import { MqttSecureServer, MqttServerListener } from './server'
import { assert } from 'chai'
import 'should'

const port = 9899
const KEY = path.join(__dirname, 'helpers', 'tls-key.pem')
const CERT = path.join(__dirname, 'helpers', 'tls-cert.pem')
const WRONG_CERT = path.join(__dirname, 'helpers', 'wrong-cert.pem')

const serverListener: MqttServerListener = (client) => {
	// this is the Server's MQTT Client
	client.on('connect', (packet) => {
		if (packet.clientId === 'invalid') {
			client.connack({ returnCode: 2 })
		} else {
			server.emit('connect', client)
			client.connack({ returnCode: 0 })
		}
	})

	client.on('publish', (packet) => {
		setImmediate(() => {
			/* jshint -W027 */
			/* eslint default-case:0 */
			switch (packet.qos) {
				case 0:
					break
				case 1:
					client.puback(packet)
					break
				case 2:
					client.pubrec(packet)
					break
			}
			/* jshint +W027 */
		})
	})

	client.on('pubrel', (packet) => {
		client.pubcomp(packet)
	})

	client.on('pubrec', (packet) => {
		client.pubrel(packet)
	})

	client.on('pubcomp', () => {
		// Nothing to be done
	})

	client.on('subscribe', (packet) => {
		client.suback({
			messageId: packet.messageId,
			granted: packet.subscriptions.map((e) => e.qos),
		})
	})

	client.on('unsubscribe', (packet) => {
		client.unsuback(packet)
	})

	client.on('pingreq', () => {
		client.pingresp()
	})
}

const server = new MqttSecureServer(
	{
		key: fs.readFileSync(KEY),
		cert: fs.readFileSync(CERT),
	},
	serverListener,
).listen(port)

describe('MqttSecureClient', () => {
	const config = { protocol: 'mqtts', port, rejectUnauthorized: false }
	abstractClientTests(server, config)

	describe('with secure parameters', () => {
		it('should validate successfully the CA', function test(done) {
			const client = mqtt.connect({
				protocol: 'mqtts',
				port,
				ca: [fs.readFileSync(CERT)],
				rejectUnauthorized: true,
			})

			client.on('error', (err) => {
				done(err)
			})

			server.once('connect', () => {
				done()
			})
		})

		it('should validate successfully the CA using URI', function test(done) {
			const client = mqtt.connect(`mqtts://localhost:${port}`, {
				ca: [fs.readFileSync(CERT)],
				rejectUnauthorized: true,
			})

			client.on('error', (err) => {
				done(err)
			})

			server.once('connect', () => {
				done()
			})
		})

		it('should validate successfully the CA using URI with path', function test(done) {
			const client = mqtt.connect(`mqtts://localhost:${port}/`, {
				ca: [fs.readFileSync(CERT)],
				rejectUnauthorized: true,
			})

			client.on('error', (err) => {
				done(err)
			})

			server.once('connect', () => {
				done()
			})
		})

		it('should validate unsuccessfully the CA', function test(done) {
			const client = mqtt.connect({
				protocol: 'mqtts',
				port,
				ca: [fs.readFileSync(WRONG_CERT)],
				rejectUnauthorized: true,
			})

			client.once('error', (err) => {
				err.should.be.instanceOf(Error)
				client.end((err2) => done(err2))
			})
		})

		it('should emit close on TLS error', function test(done) {
			const client = mqtt.connect({
				protocol: 'mqtts',
				port,
				ca: [fs.readFileSync(WRONG_CERT)],
				rejectUnauthorized: true,
			})

			client.on('error', () => {})

			client.once('close', () => {
				client.end((err) => done(err))
			})
		})

		it('should support SNI on the TLS connection', function test(done) {
			const hostname = 'localhost'

			server.removeAllListeners('secureConnection') // clear eventHandler
			server.once('secureConnection', (tlsSocket) => {
				// one time eventHandler
				assert.equal((tlsSocket as any).servername, hostname) // validate SNI set
				server.setupConnection(tlsSocket)
			})

			const client = mqtt.connect({
				protocol: 'mqtts',
				port,
				ca: [fs.readFileSync(CERT)],
				rejectUnauthorized: true,
				host: hostname,
			})

			client.on('error', (err) => {
				done(err)
			})

			server.once('connect', () => {
				server.on('secureConnection', server.setupConnection) // reset eventHandler
				client.end((err) => done(err))
			})
		})
	})
})
