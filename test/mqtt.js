/**
 * Testing includes
 */

var should = require('should');

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
});
