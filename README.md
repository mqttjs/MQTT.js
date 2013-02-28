# mqtt.js

## Introduction
mqtt.js library for the MQTT protocol, written in javascript.
It allows the creation of both MQTT clients and MQTT brokers
through the `createClient` and `createServer` API methods.

Much of this document requires an understanding of the MQTT protocol,
so consult the [MQTT documentation](http://mqtt.org/documentation)
for more information.

## Installation

    npm install mqtt

## Clients

This project also contains two extremely simple MQTT clients `bin/mqtt_pub`
and `bin/mqtt_sub` can be executed from the command line in the following ways:

    mqtt_pub <port> <host> <topic> <payload>
    mqtt_sub <port> <host> <topic>

where

* `port` is the port the MQTT server is listening on
* `host` is the MQTT server's host
* `topic` is the topic to publish/subscribe to
* `payload` is the payload to publish

These are expected to improve as the project goes on.

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
        util.log('error!');
      });
    }).listen(1883);

Client API usage
----------------

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

## Documentation

Detailed documentation can be found in [the wiki](wiki)
