/*global describe, it, beforeEach */

var assert = require('assert'),
  should = require('should');

var protocol = require('../../lib/protocol'),
  Connection = require('../../lib/connection'),
  make_tester = require('./tester');

var tester = make_tester();
var connection = new Connection(tester);

function make_protocol_type_case(type) {
  return it('#' + type, function () {
    var method = connection[type];
    method.should.be.a('function');
  });
}


describe.skip("Connection", function () {

  describe("should have functions for", function () {
    var typenum;
    for (typenum in protocol.types) {
      if (protocol.types.hasOwnProperty(typenum)) {
        make_protocol_type_case.call(this, protocol.types[typenum]);
      }
    }
  });


  describe("should emit on stream event", function () {
    beforeEach(function () {
      this.tester = make_tester();
      this.connection = new Connection(this.tester);
    });

    it("close", function (done) {
      this.connection.on('close', done);
      this.tester.do_emit('close');
    });

    it("error", function (done) {
      this.connection.on('error', function (err) {
        should.exist(err);
        err.should.be.instanceOf(Error);
        done();
      });
      this.tester.do_emit('error', new Error("fake test one"));
    });

  });
});
