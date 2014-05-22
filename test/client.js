/**
 * Testing dependencies
 */

var mqtt = require('..')
  , should = require('should')
  , abstractClientTests = require("./abstract_client");

/**
 * Modules to be tested
 */
var createClient = require('../lib/mqtt').createClient;

/**
 * Testing options
 */
var port = 9876;

/**
 * Test server
 */
var server = mqtt.createServer(function (client) {

  client.on('connect', function(packet) {
    if (packet.clientId === 'invalid') {
      client.connack({returnCode: 2});
    } else {
      client.connack({returnCode: 0});
    }
  });

  client.on('publish', function (packet) {
    switch (packet.qos) {
      case 0:
        break;
      case 1:
        client.puback(packet);
        break;
      case 2:
        client.pubrec(packet);
        break;
    }
  });

  client.on('pubrel', function(packet) {
    client.pubcomp(packet);
  });

  client.on('pubrec', function(packet) {
    client.pubrel(packet);
  });

  client.on('pubcomp', function(packet) {
    // Nothing to be done
  });

  client.on('subscribe', function(packet) {
    client.suback({
      messageId: packet.messageId,
      granted: packet.subscriptions.map(function (e) {
        return e.qos;
      })
    });
  });

  client.on('unsubscribe', function(packet) {
    client.unsuback(packet);
  });

  client.on('pingreq', function(packet) {
    client.pingresp();
  });
}).listen(port);


describe('MqttClient', function() {
  describe('creating', function() {
    it('should allow instantiation of MqttClient without the \'new\' operator' , function(done) {
      should(function() {
	var client;
	
	try {
	  client = mqtt.MqttClient(function() {
	    throw Error('break');
	  }, {});
	} catch (err) {
	  if (err.message !== 'break') {
	    throw err;
	  }
	  done();
	}
      }).not.throw("Object #<Object> has no method '_setupStream'");
    });
  });
  
  abstractClientTests(server, createClient, port);
  
  describe('message ids', function() {
    it('should increment the message id', function() {
      var client = createClient();
      var currentId = client._nextId();

      client._nextId().should.equal(currentId + 1);
    }),

    it('should return 1 once the interal counter reached limit', function() {
      var client = createClient();
      client.nextId = 65535;

      client._nextId().should.equal(65535);
      client._nextId().should.equal(1);
    })
  })
});
