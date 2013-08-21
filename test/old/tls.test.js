/*global describe, it, before */


var assert = require('assert'),
  should = require('should');

var servers = require('./helpers/server'),
  mqtt = require('..');

var KEY = __dirname + '/helpers/tls-key.pem';
var CERT = __dirname + '/helpers/tls-cert.pem';

var options = {
  keyPath: KEY,
  certPath: CERT,
  rejectUnauthorized : false
};

var PORT = (process.env.PORT || 1883) + 1; //port collides with other tests so +1

describe("SecureClient", function () {
  before(function () {
    this.server = servers.init_secure_server(PORT, KEY, CERT);
  });

  it("should connect", function (done) {
    var client = mqtt.createSecureClient(PORT, 'localhost', options);

    client.on('connect', function (packet) {
      done();
    });
    client.on('error', function (err) {
      should.not.exist(err);
      done();
    });

  });
});
