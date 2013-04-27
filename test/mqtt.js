/**
 * Testing includes
 */

var should = require('should')
  , net = require('net');

/**
 * Unit under test
 */

var mqtt = require('../lib/mqtt');

describe('mqtt', function() {
  describe('#createClient', function() {
    it('should return an MqttClient', function() {
      var c = mqtt.createClient();

      c.should.be.instanceOf(mqtt.MqttClient);
    });
  });

  describe('#createSecureClient', function() {
    it('should return an MqttClient', function() {
      var c = mqtt.createSecureClient();

      c.should.be.instanceOf(mqtt.MqttClient);
    });

    it('should support passing the key and cert', function() {
      var c = mqtt.createSecureClient({
        keyPath: __dirname + '/helpers/private-key.pem',
        certPath: __dirname + '/helpers/public-cert.pem'
      });

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
