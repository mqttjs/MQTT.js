'use strict';
/**
 * Testing requires
 */

var server = require('../lib/server'),
  Connection = require('mqtt-connection'),
  mqtt = require('../');

describe('MqttServer', function () {
  it('should emit MqttServerClients', function (done) {
    var s = new server.MqttServer();
    s.listen(9877);

    s.on('client', function (client) {
      client.should.be.instanceOf(Connection);
      done();
    });

    mqtt.createClient(9877);
  });

  it('should bind the stream\'s error in the clients', function (done) {
    var s = new server.MqttServer();
    s.listen(9878);

    s.on('client', function (client) {
      client.on('error', function () {
        done();
      });
      client.stream.emit('error', new Error('bad idea!'));
    });

    mqtt.createClient(9878);
  });

  it('should bind the stream\'s close in the clients', function (done) {
    var s = new server.MqttServer();
    s.listen(9879);

    s.on('client', function (client) {
      client.on('close', done);
      client.stream.emit('close');
    });

    mqtt.createClient(9879);
  });
});
