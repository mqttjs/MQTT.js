'use strict';
/**
 * Testing dependencies
 */

var mqtt = require('../../lib/connect'),
  ports = require('./ports');


function clientTests (buildClient) {
  var client;

  beforeEach(function () {
    client = buildClient();
  });

  afterEach(function (done) {
    client.once('close', done);
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
  describe('specifying a port', function () {
    clientTests(function () {
      return mqtt.connect({ port: ports.port });
    });
  });

  describe('specifying a port and host', function () {
    clientTests(function () {
      return mqtt.connect({ port: ports.port, host: 'localhost' });
    });
  });

  describe('specifying a URL', function () {
    clientTests(function () {
      return mqtt.connect('ws://localhost:' + ports.port);
    });
  });

  describe('specifying a URL with a path', function () {
    clientTests(function () {
      return mqtt.connect('ws://localhost:' + ports.port + '/mqtt');
    });
  });

  describe.skip('specifying nothing', function () {
    clientTests(function () {
      return mqtt.connect();
    });
  });
});
