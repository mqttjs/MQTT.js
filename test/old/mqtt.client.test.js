/*global describe, it */

var assert = require('assert'),
  should = require('should');

var mqtt = require('../lib/mqtt'),
  Connection = require('../../lib/connection');

describe.skip("Mqtt.createClient", function () {

  it("should return Connection", function () {
    var client = mqtt.createClient();
    client.should.be.instanceOf(Connection);
  });

  it("should callback error if not able to connect", function (done) {
    //use a non existing IP and default port
    var client = mqtt.createClient('127.0.0.3', false, function (err) {
      should.exist(err);
      err.should.be.instanceOf(Error);
      done();
    });
  });

  it("should callback with client if success", function (done) {
    var client = mqtt.createClient(function (err, c) {
      should.not.exist(err, "make sure you have a running server on the defaultPort");
      should.exist(c);
      c.should.be.instanceOf(Connection);
      done();
    });
  });

});
