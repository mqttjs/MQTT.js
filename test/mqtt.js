'use strict'

const fs = require('fs')
const path = require('path')
const mqtt = require('../')

describe('mqtt', function () {
  describe('#connect', function () {
    it('should return an MqttClient when connect is called with mqtt:/ url', function () {
      const c = mqtt.connect('mqtt://localhost:1883')

      c.should.be.instanceOf(mqtt.MqttClient)
      c.end()
    })

    it('should throw an error when called with no protocol specified', function () {
      (function () {
        const c = mqtt.connect('foo.bar.com')
        c.end()
      }).should.throw('Missing protocol')
    })

    it('should throw an error when called with no protocol specified - with options', function () {
      (function () {
        const c = mqtt.connect('tcp://foo.bar.com', { protocol: null })
        c.end()
      }).should.throw('Missing protocol')
    })

    it('should return an MqttClient with username option set', function () {
      const c = mqtt.connect('mqtt://user:pass@localhost:1883')

      c.should.be.instanceOf(mqtt.MqttClient)
      c.options.should.have.property('username', 'user')
      c.options.should.have.property('password', 'pass')
      c.end()
    })

    it('should return an MqttClient with username and password options set', function () {
      const c = mqtt.connect('mqtt://user@localhost:1883')

      c.should.be.instanceOf(mqtt.MqttClient)
      c.options.should.have.property('username', 'user')
      c.end()
    })

    it('should return an MqttClient with the clientid with random value', function () {
      const c = mqtt.connect('mqtt://user@localhost:1883')

      c.should.be.instanceOf(mqtt.MqttClient)
      c.options.should.have.property('clientId')
      c.end()
    })

    it('should return an MqttClient with the clientid with empty string', function () {
      const c = mqtt.connect('mqtt://user@localhost:1883?clientId=')

      c.should.be.instanceOf(mqtt.MqttClient)
      c.options.should.have.property('clientId', '')
      c.end()
    })

    it('should return an MqttClient with the clientid option set', function () {
      const c = mqtt.connect('mqtt://user@localhost:1883?clientId=123')

      c.should.be.instanceOf(mqtt.MqttClient)
      c.options.should.have.property('clientId', '123')
      c.end()
    })

    it('should return an MqttClient when connect is called with tcp:/ url', function () {
      const c = mqtt.connect('tcp://localhost')

      c.should.be.instanceOf(mqtt.MqttClient)
      c.end()
    })

    it('should return an MqttClient with correct host when called with a host and port', function () {
      const c = mqtt.connect('tcp://user:pass@localhost:1883')

      c.options.should.have.property('hostname', 'localhost')
      c.options.should.have.property('port', 1883)
      c.end()
    })

    const sslOpts = {
      keyPath: path.join(__dirname, 'helpers', 'private-key.pem'),
      certPath: path.join(__dirname, 'helpers', 'public-cert.pem'),
      caPaths: [path.join(__dirname, 'helpers', 'public-cert.pem')]
    }

    it('should return an MqttClient when connect is called with mqtts:/ url', function () {
      const c = mqtt.connect('mqtts://localhost', sslOpts)

      c.options.should.have.property('protocol', 'mqtts')

      c.on('error', function () {})

      c.should.be.instanceOf(mqtt.MqttClient)
      c.end()
    })

    it('should return an MqttClient when connect is called with ssl:/ url', function () {
      const c = mqtt.connect('ssl://localhost', sslOpts)

      c.options.should.have.property('protocol', 'ssl')

      c.on('error', function () {})

      c.should.be.instanceOf(mqtt.MqttClient)
      c.end()
    })

    it('should return an MqttClient when connect is called with ws:/ url', function () {
      const c = mqtt.connect('ws://localhost', sslOpts)

      c.options.should.have.property('protocol', 'ws')

      c.on('error', function () {})

      c.should.be.instanceOf(mqtt.MqttClient)
      c.end()
    })

    it('should return an MqttClient when connect is called with wss:/ url', function () {
      const c = mqtt.connect('wss://localhost', sslOpts)

      c.options.should.have.property('protocol', 'wss')

      c.on('error', function () {})

      c.should.be.instanceOf(mqtt.MqttClient)
      c.end()
    })

    const sslOpts2 = {
      key: fs.readFileSync(path.join(__dirname, 'helpers', 'private-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'helpers', 'public-cert.pem')),
      ca: [fs.readFileSync(path.join(__dirname, 'helpers', 'public-cert.pem'))]
    }

    it('should throw an error when it is called with cert and key set but no protocol specified', function () {
      // to do rewrite wrap function
      (function () {
        const c = mqtt.connect(sslOpts2)
        c.end()
      }).should.throw('Missing secure protocol key')
    })

    it('should throw an error when it is called with cert and key set and protocol other than allowed: mqtt,mqtts,ws,wss,wxs', function () {
      (function () {
        sslOpts2.protocol = 'UNKNOWNPROTOCOL'
        const c = mqtt.connect(sslOpts2)
        c.end()
      }).should.throw()
    })

    it('should return a MqttClient with mqtts set when connect is called key and cert set and protocol mqtt', function () {
      sslOpts2.protocol = 'mqtt'
      const c = mqtt.connect(sslOpts2)

      c.options.should.have.property('protocol', 'mqtts')

      c.on('error', function () {})

      c.should.be.instanceOf(mqtt.MqttClient)
    })

    it('should return a MqttClient with mqtts set when connect is called key and cert set and protocol mqtts', function () {
      sslOpts2.protocol = 'mqtts'
      const c = mqtt.connect(sslOpts2)

      c.options.should.have.property('protocol', 'mqtts')

      c.on('error', function () {})

      c.should.be.instanceOf(mqtt.MqttClient)
    })

    it('should return a MqttClient with wss set when connect is called key and cert set and protocol ws', function () {
      sslOpts2.protocol = 'ws'
      const c = mqtt.connect(sslOpts2)

      c.options.should.have.property('protocol', 'wss')

      c.on('error', function () {})

      c.should.be.instanceOf(mqtt.MqttClient)
    })

    it('should return a MqttClient with wss set when connect is called key and cert set and protocol wss', function () {
      sslOpts2.protocol = 'wss'
      const c = mqtt.connect(sslOpts2)

      c.options.should.have.property('protocol', 'wss')

      c.on('error', function () {})

      c.should.be.instanceOf(mqtt.MqttClient)
    })

    it('should return an MqttClient with the clientid with option of clientId as empty string', function () {
      const c = mqtt.connect('mqtt://localhost:1883', {
        clientId: ''
      })

      c.should.be.instanceOf(mqtt.MqttClient)
      c.options.should.have.property('clientId', '')
    })

    it('should return an MqttClient with the clientid with option of clientId empty', function () {
      const c = mqtt.connect('mqtt://localhost:1883')

      c.should.be.instanceOf(mqtt.MqttClient)
      c.options.should.have.property('clientId')
      c.end()
    })

    it('should return an MqttClient with the clientid with option of with specific clientId', function () {
      const c = mqtt.connect('mqtt://localhost:1883', {
        clientId: '123'
      })

      c.should.be.instanceOf(mqtt.MqttClient)
      c.options.should.have.property('clientId', '123')
      c.end()
    })
  })
})
