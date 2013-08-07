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
  describe('remoteAddress', function(){
    beforeEach(function () {
      this.stream = new Stream();
      this.server = {
        config : {
          parseProxyProtocol : true
        }
      };
      this.conn = new Connection(this.stream, this.server);
    });
    it('should return sockets forwardedFor address', function(done){
      var that = this,
       fixture = [
        16, 18, // Header
        0, 6, // Protocol id length
        77, 81, 73, 115, 100, 112, // Protocol id
        3, // Protocol version
        0, // Connect flags
        0, 30, // Keepalive
        0, 4, //Client id length
        116, 101, 115, 116 // Client id
      ];

      this.stream.write(new Buffer('PROXY TCP4 192.168.0.1 192.168.0.11 56324 443\r\n'));
      this.stream.write(new Buffer(fixture));
      this.conn.on('connect', function(packet) {
        that.conn.remoteAddress.should.equal('192.168.0.1');
        done();
      });
    });
    it('should return sockets remoteAddress if proxy was not used', function(){
      this.stream.remoteAddress = '10.0.0.1';

      this.conn.remoteAddress.should.equal('10.0.0.1');
    });
  });
  describe('parsing proxy protocol', function(){
    beforeEach(function () {
      this.stream = new Stream();
      this.server = {
        config : {
          parseProxyProtocol : true
        }
      };
      this.conn = new Connection(this.stream, this.server);
    });
    it('should parse send-proxy packet', function(done) {
      var that = this,
        fixture = [
        16, 18, // Header
        0, 6, // Protocol id length
        77, 81, 73, 115, 100, 112, // Protocol id
        3, // Protocol version
        0, // Connect flags
        0, 30, // Keepalive
        0, 4, //Client id length
        116, 101, 115, 116 // Client id
      ];

      this.stream.write(new Buffer('PROXY TCP4 192.168.0.1 192.168.0.11 56324 443\r\n'));
      this.stream.write(new Buffer(fixture));
      this.conn.on('connect', function(packet) {
        that.conn.proxyInfo.should.eql({
          family        : 'TCP4',
          remoteAddress : '192.168.0.1',
          remotePort    : '56324',
          proxyAddress  : '192.168.0.11',
          proxyPort     : '443'
        });
        done();
      });
    });
    it('should parse send-proxy packet that arrives multiple packets', function(done) {
      var that = this,
        fixture = [
        16, 18, // Header
        0, 6, // Protocol id length
        77, 81, 73, 115, 100, 112, // Protocol id
        3, // Protocol version
        0, // Connect flags
        0, 30, // Keepalive
        0, 4, //Client id length
        116, 101, 115, 116 // Client id
      ];

      this.stream.write(new Buffer('PROXY TCP4 192.168.0.1 '));
      setTimeout(function(){
        that.stream.write(new Buffer('192.168.0.11 56324 443\r\n'));
        that.stream.write(new Buffer(fixture));
      }, 100);
      this.conn.on('connect', function(packet) {
        that.conn.proxyInfo.should.eql({
          family        : 'TCP4',
          remoteAddress : '192.168.0.1',
          remotePort    : '56324',
          proxyAddress  : '192.168.0.11',
          proxyPort     : '443'
        });
        done();
      });
    });
  });
});
