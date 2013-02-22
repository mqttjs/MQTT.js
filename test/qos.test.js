/*global describe, it, before, after */

var assert = require('assert'),
  should = require('should');

var servers = require('./helpers/server');

var mqtt = require('../lib/mqtt'),
  HOST = 'localhost',
  PORT = (process.env.PORT || 1883) + 2;




describe.skip("Client-Server QOS Test", function () {
  before(function (done) {
    var self = this;
    this.server = servers.init_server(PORT);
    mqtt.createClient(PORT, HOST, function (err, client) {
      should.not.exist(err);
      self.client = client;
      done();
    });
  });

  describe("Client", function () {
    it("Client should connect", function (done) {
      this.client.connect({keepalive: 1000});
      this.client.on('connack', function (packet) {
        done();
      });
    });

    it("qos 0", function (done) {
      this.client.publish({
        topic: 'test0',
        payload: 'test',
        qos: 0
      });
      done();
    });


    it("qos 1", function (done) {
      this.client.once('puback', function (packet) {
        should.exist(packet);
        packet.should.have.property('messageId');
        done();
      });
      this.client.publish({
        topic: 'test1',
        payload: 'test',
        qos: 1
      });
    });

    it("qos 2", function (done) {
      this.client.once('pubrec', function (packet) {
        should.exist(packet);
        packet.should.have.property('messageId');
        done();
      });
      this.client.publish({
        topic: 'test2',
        payload: 'test',
        qos: 2
      });
    });
  });//describe client
});
