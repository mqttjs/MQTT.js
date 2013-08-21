/**
 * Testing requires
 */
var should = require('should')
  , Stream = require('./util').TestStream;

/**
 * Units under test
 */
var Connection = require('../lib/connection');


describe('Connection', function() {
  beforeEach(function () {
    var that = this;
    this.stream = new Stream();
    this.conn = this.stream.pipe(new Connection());
  });

  describe('parsing', require('./connection.parse.js'));
  describe('transmission', require('./connection.transmit.js'));
  describe('miscellaneous', function() {
    it('should reset packet state before firing callbacks', function(done) {
      var fixture = [
        16, 18, // Header 
        0, 6, // Protocol id length
        77, 81, 73, 115, 100, 112, // Protocol id
        3, // Protocol version
        0, // Connect flags 
        0, 30, // Keepalive 
        0, 4, //Client id length 
        116, 101, 115, 116 // Client id
      ];

      this.stream.write(new Buffer(fixture));
      this.conn.on('connect', function(packet) {
        this.packet.should.eql({});
        done();
      });
    });

    describe('set encoding', function () {
      it('should emit a buffer as payload', function(done) {
        var expected = {
          cmd: "publish",
          retain: false,
          qos: 0,
          dup: false,
          length: 10,
          topic: "test",
          payload: "test"
        };

        var fixture = [
          48, 10, // Header 
          0, 4, // Topic length
          116, 101, 115, 116, // Topic (test)
          116, 101, 115, 116 // Payload (test)
        ];

        this.conn.setPacketEncoding('binary');

        this.stream.write(new Buffer(fixture));

        this.conn.once('publish', function(packet) {
          Buffer.isBuffer(packet.payload).should.be.ok
          done();
        });
      });
    });
    it('should emit a string as payload', function(done) {
      this.conn.setPacketEncoding('utf8');
      var expected = {
        cmd: "publish",
        retain: false,
        qos: 0,
        dup: false,
        length: 10,
        topic: "test",
        payload: "test"
      };

      var fixture = [
        48, 10, // Header
        0, 4, // Topic length
        116, 101, 115, 116, // Topic (test)
        116, 101, 115, 116 // Payload (test)
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('publish', function(packet) {
        packet.payload.should.equal('test');
        done();
      });
    });
  });
});
