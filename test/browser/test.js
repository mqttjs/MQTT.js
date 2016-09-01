'use strict';
/**
 * Testing dependencies
 */

var mqtt = require('../../lib/connect'),
  _URL = require('url'),
  parsed = _URL.parse(document.URL),
  isHttps = 'https:' === parsed.protocol,
  port = parsed.port || (isHttps ? 443 : 80),
  host = parsed.hostname,
  protocol = isHttps ? 'wss' : 'ws';

console.log(parsed);

function clientTests (buildClient) {
  var client;

  beforeEach(function () {
    client = buildClient();
    client.on('offline', function () {
      console.log('client offline');
    });
    client.on('connect', function () {
      console.log('client connect');
    });
    client.on('reconnect', function () {
      console.log('client reconnect');
    });
  });

  afterEach(function (done) {
    client.once('close', function () {
      done();
    });
    client.end();
  });

  it('should connect', function (done) {
    client.on('connect', function () {
      done();
    });
  });

  it('should publish and subscribe', function (done) {
    client.subscribe('hello', function () {
      done();
    }).publish('hello', 'world');
  });
}

describe('MqttClient', function () {
  this.timeout(10000);

  describe('specifying nothing', function () {
    clientTests(function () {
      return mqtt.connect();
    });
  });

  if ('localhost' === parsed.host) {
    describe('specifying a port', function () {
      clientTests(function () {
        return mqtt.connect({ protocol: protocol, port: port });
      });
    });
  }

  describe('specifying a port and host', function () {
    clientTests(function () {
      return mqtt.connect({ protocol: protocol, port: port, host: host });
    });
  });

  describe('specifying a URL', function () {
    clientTests(function () {
      return mqtt.connect(protocol + '://' + host + ':' + port);
    });
  });

  describe('specifying a URL with a path', function () {
    clientTests(function () {
      return mqtt.connect(protocol + '://' + host + ':' + port + '/mqtt');
    });
  });
});
