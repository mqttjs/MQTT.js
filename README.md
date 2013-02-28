# mqtt.js

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

A basic publish client, the basis for `bin/mqtt_pub`:

    var mqtt = require('mqtt');
    var argv = process.argv;

    for (var i = 2; i <= 5; i++) {
      if(!argv[i]) process.exit(-1);
    }

    var port = argv[2],
      host = argv[3],
      topic = argv[4],
      payload = argv[5];

    var client = mqtt.createClient(port, host)
    client.on('connect', function() {
      client.publish(topic, payload);
      client.end();
    });

## Server API usage

A broadcast server example, included in `examples/broadcast.js`:

    var mqtt = require('mqtt');

    mqtt.createServer(function(client) {
      var self = this;

      if (!self.clients) self.clients = {};

      client.on('connect', function(packet) {
        client.connack({returnCode: 0});
        client.id = packet.client;
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


