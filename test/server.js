/**
 * Testing requires
 */

var should = require('should')
  , mqtt = require('../lib/mqtt');

/**
 * Units under test
 */

var server = require('../lib/server');

describe('MqttServer', function() {
  it('should emit MqttServerClients', function(done) {
    var s = new server.MqttServer();
    s.listen(9877);

    s.on('client', function(client) {
      client.should.be.instanceOf(server.MqttServerClient);
      done();
    });

    mqtt.createClient(9877);
  });
});
