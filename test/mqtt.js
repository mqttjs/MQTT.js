/**
 * Testing includes
 */

var should = require('should')
  , net = require('net')
  , sinon = require('sinon');

/**
 * Unit under test
 */

var mqtt = require('../lib/mqtt');

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
      mqtt.createClient.calledWith('1883', 'localhost').should.be.ok;
    });

    it('should throw an error when connect is called without a brokerUrl', function () {
      (function(){
        mqtt.connect()
      }).should.throwError(/^Missing brokerUrl/);
    });

    var sslOpts = {
      keyPath: __dirname + '/helpers/private-key.pem',
      certPath: __dirname + '/helpers/public-cert.pem',
      ca: [__dirname + '/helpers/public-cert.pem']
    };

    it('should return an MqttClient when connect is called with mqtts:/ url', function () {
      var c = mqtt.connect('mqtts://localhost', sslOpts);

      c.on('error', function() {});

      c.should.be.instanceOf(mqtt.MqttClient);
    });

    it('should return an MqttClient when connect is called with ssl:/ url', function () {
      var c = mqtt.connect('ssl://localhost', sslOpts);

      c.on('error', function() {});

      c.should.be.instanceOf(mqtt.MqttClient);
    });

    it('should throw an error when an unknown protocol is supplied', function () {
      (function(){
        mqtt.connect('http://localhost')
      }).should.throwError(/^Unknown protocol/);
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

  describe('#createServer', function() {
    it('should return an MqttServer', function() {
      var s = mqtt.createServer();

      s.should.be.instanceOf(mqtt.MqttServer);
    });
  });

  describe('#createSecureServer', function() {
    it('should return an MqttSecureServer', function() {
      var s = mqtt.createSecureServer(
        __dirname + '/helpers/private-key.pem', 
        __dirname + '/helpers/public-cert.pem'
      );
      s.should.be.instanceOf(mqtt.MqttSecureServer);
    });
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
