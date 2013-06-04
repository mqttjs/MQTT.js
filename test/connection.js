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
  describe('parsing', require('./connection.parse.js'));
  describe('transmission', require('./connection.transmit.js'));
  describe('miscellaneous', function() {
    beforeEach(function () {
      this.stream = new Stream();
      this.conn = new Connection(this.stream);
    });
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
  });
});
