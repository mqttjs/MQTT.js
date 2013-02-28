/**
 * Testing requires
 */

var should = require('should'),
    child_process = require('child_process');

var exec = child_process.exec
  , spawn = child_process.spawn;

/**
 * Units under test
 */

var mqtt = require('../lib/mqtt');

/**
 * Check if we have mosquitto stuff
 */
exec('mosquitto_sub', function (err) {
  if (/not found/.test(err.message)) {
    throw new Error('Tests require mosquitto and clients');
  }
});

/**
 * Tests
 */

describe.skip('MqttClient', function() {
  describe('subscribing', function() {
    it('should receive a message event', function(done) {
      var c = mqtt.createClient();
      c.on('connect', function() {
        c.subscribe('topic');
        c.on('message', function(topic, message) {
          topic.should.equal('topic');
          message.should.equal('test');
          done();
        });
        exec('mosquitto_pub -t topic -m test');
      });
    });
  });

  describe('publishing', function() {
    it('should receive payload text', function(done) {
      var c = mqtt.createClient()
        , sub = spawn('mosquitto_sub', ['-t', 'topic']);

      this.timeout(5000);
      sub.stdout.setEncoding('utf8');

      sub.stdout.on('data', function(data) {
        if (/test/.test(data)) {
          done();
        }
      });

      c.on('connect', function() {
        c.publish('topic', 'test');
        c.end();
      });
    });
  });
});
