/**
 * Testing includes
 */

var should = require('should')
  , fs = require('fs')
  , net = require('net')
  , sinon = require('sinon');

/**
 * Unit under test
 */

var mqtt = require('../');

describe('mqtt', function() {

  describe('#connect', function () {
    it('should return an MqttClient when connect is called with mqtt:/ url', function () {
      var c = mqtt.connect('mqtt://localhost:1883');

      c.should.be.instanceOf(mqtt.MqttClient);
    });

    it('should return an MqttClient with username option set', function () {
      var c = mqtt.connect('mqtt://user:pass@localhost:1883');

      c.should.be.instanceOf(mqtt.MqttClient);
      c.options.should.have.property('username', 'user');
      c.options.should.have.property('password', 'pass');
    });

    it('should return an MqttClient with username and password options set', function () {
      var c = mqtt.connect('mqtt://user@localhost:1883');

      c.should.be.instanceOf(mqtt.MqttClient);
      c.options.should.have.property('username', 'user');
    });

    it('should return an MqttClient with the clientid option set', function () {
      var c = mqtt.connect('mqtt://user@localhost:1883?clientId=123');

      c.should.be.instanceOf(mqtt.MqttClient);
      c.options.should.have.property('clientId', '123');
    });

    it('should return an MqttClient when connect is called with tcp:/ url', function () {
      var c = mqtt.connect('tcp://localhost');

      c.should.be.instanceOf(mqtt.MqttClient);
    });

    it('should return an MqttClient with correct host when called with a host and port', function () {
      sinon.spy(mqtt, "createClient");
      var c = mqtt.connect('tcp://user:pass@localhost:1883');

      c.options.should.have.property('hostname', 'localhost');
      c.options.should.have.property('port', '1883');
    });

    var sslOpts = {
      keyPath: __dirname + '/helpers/private-key.pem',
      certPath: __dirname + '/helpers/public-cert.pem',
      caPaths: [__dirname + '/helpers/public-cert.pem']
    };

    it('should return an MqttClient when connect is called with mqtts:/ url', function () {
      var c = mqtt.connect('mqtts://localhost', sslOpts);
      
      c.options.should.have.property('protocol', 'mqtts')

      c.on('error', function() {});

      c.should.be.instanceOf(mqtt.MqttClient);
    });

    it('should return an MqttClient when connect is called with ssl:/ url', function () {
      var c = mqtt.connect('ssl://localhost', sslOpts);
      
      c.options.should.have.property('protocol', 'ssl')

      c.on('error', function() {});

      c.should.be.instanceOf(mqtt.MqttClient);
    });
    
    it('should return an MqttClient when connect is called with ws:/ url', function () {
      var c = mqtt.connect('ws://localhost', sslOpts);
      
      c.options.should.have.property('protocol', 'ws')

      c.on('error', function() {});

      c.should.be.instanceOf(mqtt.MqttClient);
    });
    
    it('should return an MqttClient when connect is called with wss:/ url', function () {
      var c = mqtt.connect('wss://localhost', sslOpts);
      
      c.options.should.have.property('protocol', 'wss')

      c.on('error', function() {});

      c.should.be.instanceOf(mqtt.MqttClient);
    });
  });

  describe('#createClient', function() {
    it('should return an MqttClient', function() {
      var c = mqtt.createClient();

      c.should.be.instanceOf(mqtt.MqttClient);
    });
  });

  describe('#createSecureClient', function() {
    it('should return an MqttClient', function() {
      var c = mqtt.createSecureClient();

      c.on('error', function() {});

      c.should.be.instanceOf(mqtt.MqttClient);
    });

    it('should support passing the key and cert', function() {
      var c = mqtt.createSecureClient({
        keyPath: __dirname + '/helpers/private-key.pem',
        certPath: __dirname + '/helpers/public-cert.pem'
      });

      c.on('error', function() {});

      c.should.be.instanceOf(mqtt.MqttClient);
    });

    it('should throw on incorrect args');
  });

  describe('#createSecureClientWithListCA', function() {
    it('should return an MqttClient', function() {
      var c = mqtt.createSecureClient();

      c.on('error', function() {});

      c.should.be.instanceOf(mqtt.MqttClient);
    });

    it('should support passing the key, cert and CA list', function() {
      var c = mqtt.createSecureClient({
        keyPath: __dirname + '/helpers/private-key.pem',
        certPath: __dirname + '/helpers/public-cert.pem',
        ca: [__dirname + '/helpers/public-cert.pem']
      });

      c.on('error', function() {});

      c.should.be.instanceOf(mqtt.MqttClient);
    });

    it('should throw on incorrect args');
  });

  describe('#createConnection', function() {
    before(function () {
      // Setup dummy server

      // If there's an error it's probably EADDRINUSE
      // Just use whatever's there already (likely mosquitto)
      this.server = new net.Server();
      this.server.listen(1883);
      this.server.on('error', function(){});
    });
    it('should return an MqttConnection', function() {
      var c = mqtt.createConnection();

      c.should.be.instanceOf(mqtt.MqttConnection);
    });

    it('should fire callback on net connect', function(done) {
      mqtt.createConnection(done);
    });
    it('should bind stream close to connection', function(done) {
      var c = mqtt.createConnection();
      c.once('connected', function() {
        c.once('close', function() { done() });
        c.stream.end();
      });
    });
    it('should bind stream error to conn', function(done) {
      var c = mqtt.createConnection();
      c.once('error', function() { done() });
      c.stream.emit('error', new Error('Bad idea!'));
    });
  });
});
