/**
 * Testing dependencies
 */

var should = require('should')
  , mqtt = require('..')
  , spawn = require('child_process').spawn;

/**
 * Modules to be tested
 */

var MqttClient = require('../lib/client');

/**
 * Testing options
 */

var port = 9876;

describe('MqttClient', function () {
  before(function () {
    this.server = mqtt.createServer();
    this.server.listen(port);
  });
  describe('#constructor', function () {

    it('should connect to the broker', function (done) {
      var client = new MqttClient(port);

      this.server.once('client', function(client) {
        done();
      });

    }); 

    it('should send a default client id', function (done) {
      var client = new MqttClient(port);

      this.server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.client.should.match(/mqttjs.*/);
          done();
        });
      });

    });

    it('should connect with the given client id', function (done) {
      var client = 
        new MqttClient(port, 'localhost', {client: 'testclient'});

      this.server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.client.should.match(/testclient/);
          done();
        });
      });
    });
    it('should default to localhost', function (done) {
      var client = new MqttClient(port, {client: 'testclient'});

      this.server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.client.should.match(/testclient/);
          done();
        });
      });
    });
  });
  after(function () {
    this.server.close();
  });
});
