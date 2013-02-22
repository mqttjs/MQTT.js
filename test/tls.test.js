/*global describe, it, before */


var assert = require('assert'),
  should = require('should');

var servers = require('./helpers/server'),
  mqtt = require('..');

var KEY = __dirname + '/helpers/private-key.pem';
var CERT = __dirname + '/helpers/public-cert.pem';

var PORT = (process.env.PORT || 1883) + 1; //port collides with other tests so +1

describe.skip("SecureClient", function () {
  before(function () {
    this.server = servers.init_secure_server(PORT);
  });

  it("should connect", function (done) {
    mqtt.createSecureClient(PORT, 'localhost', KEY, CERT, function (err, client) {
      should.not.exist(err);
      client.connect({keepalive: 1000});
      client.on('connack', function (packet) {
        done();
      });
      client.on('error', function (err) {
        should.not.exist(err);
        done();
      });
    });
  });
});
