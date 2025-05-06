import fs from 'fs'
import path from 'path'
import mqtt, { type IClientOptions } from '../../src'
import { describe, it } from 'node:test'
import 'should'

describe('mqtt', () => {
	describe('#connect', () => {
		it('should return an MqttClient when connect is called with mqtt:/ url', function _test(t, done) {
			const c = mqtt.connect('mqtt://localhost:1883')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.end((err) => done(err))
		})

		it('should throw an error when called with no protocol specified', () => {
			;(() => {
				mqtt.connect('foo.bar.com')
			}).should.throw('Missing protocol')
		})

		it('should throw an error when called with no protocol specified - with options', () => {
			;(() => {
				mqtt.connect('tcp://foo.bar.com', { protocol: null })
			}).should.throw('Missing protocol')
		})

		it('should return an MqttClient with username option set', function _test(t, done) {
			const c = mqtt.connect('mqtt://user:pass@localhost:1883')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.have.property('username', 'user')
			c.options.should.have.property('password', 'pass')
			c.options.should.not.have.property('path')
			c.end((err) => done(err))
		})

		it('should return an MqttClient with path set when protocol is ws/wss', function _test(t, done) {
			const c = mqtt.connect('ws://localhost:1883/mqtt')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.have.property('path', '/mqtt')
			c.options.should.have.property('unixSocket', false)
			c.end((err) => done(err))
		})

		it('should work with unix sockets', function _test(t, done) {
			const c = mqtt.connect('mqtt+unix:///tmp/mqtt.sock')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.have.property('path', '/tmp/mqtt.sock')
			c.options.should.have.property('unixSocket', true)

			c.end((err) => done(err))
		})

		it('should not set `path` when parsing url', function _test(t, done) {
			const c = mqtt.connect('mqtt://[::1]')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.not.have.property('path')
			c.options.should.have.property('host', '::1')
			c.end((err) => done(err))
		})

		it('should return an MqttClient with username and password options set', function _test(t, done) {
			const c = mqtt.connect('mqtt://user@localhost:1883')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.not.have.property('path')
			c.options.should.have.property('username', 'user')
			c.end((err) => done(err))
		})

		it('should return an MqttClient with the clientid with random value', function _test(t, done) {
			const c = mqtt.connect('mqtt://user@localhost:1883')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.have.property('clientId')
			c.end((err) => done(err))
		})

		it('should return an MqttClient with the clientid with empty string', function _test(t, done) {
			const c = mqtt.connect('mqtt://user@localhost:1883?clientId=')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.have.property('clientId', '')
			c.end((err) => done(err))
		})

		it('should return an MqttClient with the clientid option set', function _test(t, done) {
			const c = mqtt.connect('mqtt://user@localhost:1883?clientId=123')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.have.property('clientId', '123')
			c.end((err) => done(err))
		})

		it('should return an MqttClient when connect is called with tcp:/ url', function _test(t, done) {
			const c = mqtt.connect('tcp://localhost')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.end((err) => done(err))
		})

		it('should return an MqttClient with correct host when called with a host and port', function _test(t, done) {
			const c = mqtt.connect('tcp://user:pass@localhost:1883')

			c.options.should.have.property('hostname', 'localhost')
			c.options.should.have.property('port', 1883)
			c.end((err) => done(err))
		})

		const sslOpts: IClientOptions = {
			keyPath: path.join(__dirname, 'helpers', 'private-key.pem'),
			certPath: path.join(__dirname, 'helpers', 'public-cert.pem'),
			caPaths: [path.join(__dirname, 'helpers', 'public-cert.pem')],
		}

		it('should return an MqttClient when connect is called with mqtts:/ url', function _test(t, done) {
			const c = mqtt.connect('mqtts://localhost', sslOpts)

			c.options.should.have.property('protocol', 'mqtts')

			c.on('error', () => {})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.end((err) => done(err))
		})

		it('should return an MqttClient when connect is called with ssl:/ url', function _test(t, done) {
			const c = mqtt.connect('ssl://localhost', sslOpts)

			c.options.should.have.property('protocol', 'ssl')

			c.on('error', () => {})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.end((err) => done(err))
		})

		it('should return an MqttClient when connect is called with ws:/ url', function _test(t, done) {
			const c = mqtt.connect('ws://localhost', sslOpts)

			c.options.should.have.property('protocol', 'ws')

			c.on('error', () => {})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.end((err) => done(err))
		})

		it('should return an MqttClient when connect is called with wss:/ url', function _test(t, done) {
			const c = mqtt.connect('wss://localhost', sslOpts)

			c.options.should.have.property('protocol', 'wss')

			c.on('error', () => {})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.end((err) => done(err))
		})

		const sslOpts2: IClientOptions = {
			key: fs.readFileSync(
				path.join(__dirname, 'helpers', 'private-key.pem'),
			),
			cert: fs.readFileSync(
				path.join(__dirname, 'helpers', 'public-cert.pem'),
			),
			ca: [
				fs.readFileSync(
					path.join(__dirname, 'helpers', 'public-cert.pem'),
				),
			],
		}

		it('should throw an error when it is called with cert and key set but no protocol specified', () => {
			// to do rewrite wrap function
			;(() => {
				mqtt.connect(sslOpts2)
			}).should.throw('Missing secure protocol key')
		})

		it('should throw an error when it is called with cert and key set and protocol other than allowed: mqtt,mqtts,ws,wss,wxs', () => {
			;(() => {
				;(sslOpts2 as any).protocol = 'UNKNOWNPROTOCOL'
				mqtt.connect(sslOpts2)
			}).should.throw()
		})

		it('should return a MqttClient with mqtts set when connect is called key and cert set and protocol mqtt', function _test(t, done) {
			sslOpts2.protocol = 'mqtt'
			const c = mqtt.connect(sslOpts2)

			c.options.should.have.property('protocol', 'mqtts')

			c.on('error', () => {})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.end((err) => done(err))
		})

		it('should return a MqttClient with mqtts set when connect is called key and cert set and protocol mqtts', function _test(t, done) {
			sslOpts2.protocol = 'mqtts'
			const c = mqtt.connect(sslOpts2)

			c.options.should.have.property('protocol', 'mqtts')

			c.on('error', () => {})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.end((err) => done(err))
		})

		it('should return a MqttClient with wss set when connect is called key and cert set and protocol ws', function _test(t, done) {
			sslOpts2.protocol = 'ws'
			const c = mqtt.connect(sslOpts2)

			c.options.should.have.property('protocol', 'wss')

			c.on('error', () => {})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.end((err) => done(err))
		})

		it('should return a MqttClient with wss set when connect is called key and cert set and protocol wss', function _test(t, done) {
			sslOpts2.protocol = 'wss'
			const c = mqtt.connect(sslOpts2)

			c.options.should.have.property('protocol', 'wss')

			c.on('error', () => {})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.end((err) => done(err))
		})

		it('should return an MqttClient with the clientid with option of clientId as empty string', function _test(t, done) {
			const c = mqtt.connect('mqtt://localhost:1883', {
				clientId: '',
			})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.have.property('clientId', '')
			c.end((err) => done(err))
		})

		it('should return an MqttClient with the clientid with option of clientId empty', function _test(t, done) {
			const c = mqtt.connect('mqtt://localhost:1883')

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.have.property('clientId')
			c.end((err) => done(err))
		})

		it('should return an MqttClient with the clientid with option of with specific clientId', function _test(t, done) {
			const c = mqtt.connect('mqtt://localhost:1883', {
				clientId: '123',
			})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.have.property('clientId', '123')
			c.end((err) => done(err))
		})

		it('should return an MqttClient with mqtts protocol when connect is called with mqtts:/ url and protocol (mqtts:) is specified in options', function _test(t, done) {
			const url = 'mqtts://localhost:1883'
			const parsedUrl = new URL(url)
			const protocol = parsedUrl.protocol as 'mqtt' | 'mqtts'

			const c = mqtt.connect(url, {
				protocol,
			})

			c.should.be.instanceOf(mqtt.MqttClient)
			c.options.should.have.property('protocol', 'mqtts')
			c.end((err) => done(err))
		})
	})
})
