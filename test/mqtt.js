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
      var c = mqtt.createClient();

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
    it('should return an MqttConnection', function() {
      var c = mqtt.createConnection();

      c.should.be.instanceOf(mqtt.MqttConnection);
    });

    it('should fire callback on net connect', function(done) {
      var server = new net.Server();

      // Setup dummy server
      
      // If there's an error it's probably EADDRINUSE
      // Just use whatever's there already (likely mosquitto)
      server.once('error', function(){})
      server.listen(1883);

      mqtt.createConnection(done);
    });

    it('should accept just a callback', function(done) {
      done();
    });
  });
});
