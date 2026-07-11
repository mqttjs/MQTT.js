import path from 'path'
import fs from 'fs'
import { assert } from 'chai'
import { describe, it, after } from 'node:test'
import mqtt from '../../src'
import abstractClientTests from './abstract_client'
import { MqttSecureServer, type MqttServerListener } from './server'
import 'should'
import getPorts from './helpers/port_list'

const ports = getPorts(5)

const port = ports.PORT
const sniPort = ports.PORTAND40
const KEY = path.join(__dirname, 'helpers', 'tls-key.pem')
const CERT = path.join(__dirname, 'helpers', 'tls-cert.pem')
const WRONG_CERT = path.join(__dirname, 'helpers', 'wrong-cert.pem')
// Certificate valid only for `mqtt.example.test` (not localhost / 127.0.0.1).
const SNI_KEY = path.join(__dirname, 'helpers', 'sni-key.pem')
const SNI_CERT = path.join(__dirname, 'helpers', 'sni-cert.pem')
const SNI_HOSTNAME = 'mqtt.example.test'

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

const sniServer = new MqttSecureServer(
	{
		key: fs.readFileSync(SNI_KEY),
		cert: fs.readFileSync(SNI_CERT),
	},
	serverListener,
).listen(sniPort)

describe('MqttSecureClient', () => {
	const config = { protocol: 'mqtts', port, rejectUnauthorized: false }

	after(() => {
		// clean up and make sure the server is no longer listening...
		if (server.listening) {
			server.close()
		}

		if (sniServer.listening) {
			sniServer.close()
		}

		process.exit(0)
	})

	abstractClientTests(server, config, ports)

	describe('with secure parameters', () => {
		it('should validate successfully the CA', function _test(t, done) {
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

		it('should validate successfully the CA using URI', function _test(t, done) {
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

		it('should validate successfully the CA using URI with path', function _test(t, done) {
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

		it('should validate unsuccessfully the CA', function _test(t, done) {
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

		it('should emit close on TLS error', function _test(t, done) {
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

		it('should support SNI on the TLS connection', function _test(t, done) {
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

		it('should use an explicit servername for SNI over the connect host', function _test(t, done) {
			const hostname = 'localhost'

			server.removeAllListeners('secureConnection') // clear eventHandler
			server.once('secureConnection', (tlsSocket) => {
				// SNI reflects the explicit servername, not the connect host
				assert.equal((tlsSocket as any).servername, SNI_HOSTNAME)
				server.setupConnection(tlsSocket)
			})

			const client = mqtt.connect({
				protocol: 'mqtts',
				port,
				ca: [fs.readFileSync(CERT)],
				rejectUnauthorized: false,
				host: hostname,
				servername: SNI_HOSTNAME,
			})

			client.on('error', (err) => {
				done(err)
			})

			server.once('connect', () => {
				server.on('secureConnection', server.setupConnection) // reset eventHandler
				client.end((err) => done(err))
			})
		})

		it('should keep an explicit servername when connecting by IP', function _test(t, done) {
			server.removeAllListeners('secureConnection') // clear eventHandler
			server.once('secureConnection', (tlsSocket) => {
				// IP is never used as SNI (RFC 6066); servername is preserved
				assert.equal((tlsSocket as any).servername, SNI_HOSTNAME)
				server.setupConnection(tlsSocket)
			})

			const client = mqtt.connect({
				protocol: 'mqtts',
				port,
				ca: [fs.readFileSync(CERT)],
				rejectUnauthorized: false,
				host: '127.0.0.1',
				servername: SNI_HOSTNAME,
			})

			client.on('error', (err) => {
				done(err)
			})

			server.once('connect', () => {
				server.on('secureConnection', server.setupConnection) // reset eventHandler
				client.end((err) => done(err))
			})
		})

		it('should validate the certificate against an explicit servername', function _test(t, done) {
			// Connect host (localhost) mismatches the cert, but servername
			// (mqtt.example.test) matches, so verification must succeed.
			const client = mqtt.connect({
				protocol: 'mqtts',
				port: sniPort,
				host: 'localhost',
				servername: SNI_HOSTNAME,
				ca: [fs.readFileSync(SNI_CERT)],
				rejectUnauthorized: true,
			})

			client.on('error', (err) => {
				done(err)
			})

			client.once('connect', () => {
				client.end((err) => done(err))
			})
		})
	})
})
