# mqtt.js [![Build Status](https://travis-ci.org/adamvr/MQTT.js.png)](https://travis-ci.org/adamvr/MQTT.js)

## Important note for existing users

v0.2.0 has brough some API breaking changes to mqtt.js. Please
consult the [migration guide](http://github.com/adamvr/MQTT.js/wiki/migration) for information
or open an issue if you need any help.

## Introduction

mqtt.js is a library for the MQTT protocol, written in javascript.


## Installation

    npm install mqtt

## Documentation

Detailed documentation can be found in [the wiki](http://github.com/adamvr/MQTT.js/wiki)

## Client API usage

See: `examples/client`

Simple publish client:

    var mqtt = require('mqtt')
      , client = mqtt.createClient();

    client.publish('messages', 'mqtt');
    client.publish('messages', 'is pretty cool');
    client.publish('messages', 'remember that!', {retain: true});
    client.end();

Simple subscribe client:

    var mqtt = require('mqtt')
      , client = mqtt.createClient();

    client.subscribe('messages');
    client.publish('messages', 'hello me!');
    client.on('message', function(topic, message) {
      console.log(message);
    });

Chainable API!:

    var mqtt = require('mqtt')
      , client = mqtt.createClient();

    client
      .subscribe('messages')
      .publish('presence', 'bin hier')
      .on('message', function(topic, message) {
        console.log(topic);
      });

## Server API usage

A broadcast server example, included in `examples/broadcast.js`:

    var mqtt = require('mqtt');

    mqtt.createServer(function(client) {
      var self = this;

      if (!self.clients) self.clients = {};

      client.on('connect', function(packet) {
        client.connack({returnCode: 0});
        client.id = packet.clientId;
        self.clients[client.id] = client;
      });

      client.on('publish', function(packet) {
        for (var k in self.clients) {
          self.clients[k].publish({topic: packet.topic, payload: packet.payload});
        }
      });

      client.on('subscribe', function(packet) {
        var granted = [];
        for (var i = 0; i < packet.subscriptions.length; i++) {
          granted.push(packet.subscriptions[i].qos);
        }

        client.suback({granted: granted});
      });

      client.on('pingreq', function(packet) {
        client.pingresp();
      });

      client.on('disconnect', function(packet) {
        client.stream.end();
      });

      client.on('close', function(err) {
        delete self.clients[client.id];
      });

      client.on('error', function(err) {
        client.stream.end();
        console.log('error!');
      });
    }).listen(1883);


