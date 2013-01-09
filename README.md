mqtt.js
=======

Introduction
------------
mqtt.js library for the MQTT protocol, written in javascript.
It allows the creation of both MQTT clients and MQTT brokers
through the `createClient` and `createServer` API methods.

Much of this document requires an understanding of the MQTT protocol,
so consult the [MQTT documentation](http://mqtt.org/documentation)
for more information.

Installation
------------

    npm install mqttjs

Clients
-------
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

Server API usage
------------
A broadcast server example, included in `examples/broadcast.js`:

    var mqtt = require('../mqtt');

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

    var mqtt = require('../lib/mqtt');

    var argv = process.argv;

    for (var i = 2; i <= 5; i++) {
      if(!argv[i]) process.exit(-1);
    }

    var port = argv[2],
      host = argv[3],
      topic = argv[4],
      payload = argv[5];

    mqtt.createClient(port, host, function(err, client) {
      if (err) process.exit(1);
      client.connect({keepalive: 3000});

      client.on('connack', function(packet) {
        if (packet.returnCode === 0) {
          client.publish({topic: topic, payload: payload});
          client.disconnect();
        } else {
          console.log('connack error %d', packet.returnCode);
          process.exit(-1);
        }
      });

      client.on('close', function() {
        process.exit(0);
      });

      client.on('error', function(e) {
        console.log('error %s', e);
        process.exit(-1);
      });
    });

# API
The `mqtt` module provides two methods for creating MQTT servers and clients
as specified below:

## mqtt.createServer(listener)
Creates a new `mqtt.Server`. The listener argument is set as a listener for
the `client` event. 

## mqtt.createClient([port], [host], [callback(error, client)])
Creates a new `mqtt.Client` and connects it to the specified `port` and `host`.
If `port` and `host` are omitted `1883` and `localhost` will be assumed for 
each respectively.

When the client is connected, the `connected` event will be fired and `callback`
will be called, if supplied. If connection fails for any reason, the error
parameter of callback will bet set to the error. Otherwise it will be null
and the client parameter will be the newly created client.

* * *

##mqtt.Server
The `mqtt.Server` class represents an MQTT server.

`mqtt.Server` extends `net.Server` and so shares all of its methods with the
distinction that the `net.Server#connected` event is caught and the `client`
event is fired.

### Event: 'client'
`function(client) {}`
Emitted when a new TCP connection is received. `client` is an instance of
`mqtt.Client`.

* * *

##mqtt.Client
The `mqtt.Client` class represents a connected MQTT client, be it on the server
or client side.

It is preferred that `mqtt.Client`s be constructed using the `mqtt.createClient`
factory method.

For all methods below invalid `options` will cause the method to return `false`.

For all events below `packet` will also contain all of the information contained
in the MQTT static header. This includes `cmd`, `dup`, `qos` and `retain` even
when they do not apply to the packet. It will also contain the `length` of the packet.

###client.connect([options])
Send an MQTT connect packet.

`options` is an object with the following defaults:
    
    { "version": "MQIsdp",
      "versionNum": 3,
      "keepalive": 60,
      "client": "mqtt_" + process.pid,
    }

`options` supports the following properties:

* `version`: version string, defaults to `MQIsdp`. Must be a `string`
* `versionNum`: version number, defaults to `3`. Must be a `number`
* `keepalive`: keepalive period, defaults to `60`. Must be a `number` between `0` and `65535`
* `client`: the client ID supplied for the session, defaults to `mqtt_<pid>`. `string`
* `will`: the client's will message options. `object` that supports the following properties:
  * `topic`: the will topic
  * `payload`: the will payload
  * `qos`: the qos level to publish the will message with
  * `retain`: whether or not to retain the will message
* `clean`: the 'clean start' flag. `boolean`
* `username`: username for protocol v3.1. `string`
* `password`: password for protocol v3.1. `string`

###client.connack([options])
Send an MQTT connack packet.

`options` is an object with the following defaults:

    { "returnCode": 0 }

`options` supports the following properties:

* `returnCode`: the return code of the connack, defaults to `0`. Must be a `number` between `0` and `5`

###client.publish([options])
Send an MQTT publish packet.

`options` is an object with the following defaults:

    { "messageId": Math.floor(65535 * Math.random()),
      "payload": "",
      "qos": 0,
      "retain": false
    }

`options` supports the following properties:

* `topic`: the topic to publish to. `string`
* `payload`: the payload to publish, defaults to an empty buffer. `string` or `buffer`
* `qos`: the quality of service level to publish on. `number` between `0` and `2`
* `messageId`: the message ID of the packet, defaults to a random integer between `0` and `65535`. `number`
* `retain`: whether or not to retain the published message. `boolean`

###client.\['puback', 'pubrec', 'pubcomp', 'unsuback'\]([options])
Send an MQTT `[puback, pubrec, pubcomp, unsuback]` packet.

`options` supports the following properties:

* `messageId`: the ID of the packet

###client.pubrel([options])
Send an MQTT pubrel packet.

`options` is an object with the following defaults:

    { "dup": false }

`options` supports the following properties:

* `dup`: duplicate message flag
* `messageId`: the ID of the packet

###client.subscribe([options])
Send an MQTT subscribe packet.

`options` is an object with the following defaults:

    { "dup": false,
      "messageId": Math.floor(65535 * Math.random())
    }

`options` supports the following properties:

* `dup`: duplicate message flag
* `messageId`: the ID of the packet

And either:

* `topic`: the topic to subscribe to
* `qos`: the requested QoS subscription level

Or:

* `subscriptions`: a list of subscriptions of the form `[{topic: a, qos: 0}, {topic: b, qos: 1}]` or of the form ['a', 'b']

###client.suback([options])
Send an MQTT suback packet.

`options` is an object with the following defaults:

    { "granted": [0],
      "messageId": Math.floor(65535 * Math.random())
    }

`options` supports the following properties:

* `granted`: a vector of granted QoS levels, of the form `[0, 1, 2]`
* `messageId`: the ID of the packet

###client.unsubscribe([options])
Send an MQTT unsubscribe packet.

`options` is an object with the following defaults:

    { "messageId": Math.floor(65535 * Math.random()) }

`options` supports the following properties:

* `messageId`: the ID of the packet
* `dup`: duplicate message flag

And either:

* `topic`: the topic to unsubscribe from

Or:

* `unsubscriptions`: a list of topics to unsubscribe from, of the form `["topic1", "topic2"]`

###client.\['pingreq', 'pingresp', 'disconnect'\]()
Send an MQTT `[pingreq, pingresp, disconnect]` packet.

###Event: 'connected'
`function() {}`

Emitted when the socket underlying the `mqtt.Client` is connected.

Note: only emitted by clients created using `mqtt.createClient()`.

###Event: 'connect'
`function(packet) {}`

Emitted when an MQTT connect packet is received by the client.

`packet` is an object that may have the following properties:

* `version`: the protocol version string
* `versionNum`: the protocol version number
* `keepalive`: the client's keepalive period
* `client`: the client's ID
* `will`: an object of the form:
  
    `{ "topic": "topic",
      "payload": "payload",
      "retain": false,
      "qos": 0
    }`

  where `topic` is the client's will topic, `payload` is its will message,
  `retain` is whether or not to retain the will message and `qos` is the
  QoS of the will message.

* `clean`: clean start flag
* `username`: v3.1 username
* `password`: v3.1 password

###Event: 'connack'
`function(packet) {}`

Emitted when an MQTT connack packet is received by the client.

`packet` is an object that may have the following properties:

* `returnCode`: the return code of the connack packet

###Event: 'publish'
`function(packet) {}`

Emitted when an MQTT publish packet is received by the client.

`packet` is an object that may have the following properties:

* `topic`: the topic the message is published on
* `payload`: the payload of the message
* `messageId`: the ID of the packet
* `qos`: the QoS level to publish at

###Events: \['puback', 'pubrec', 'pubrel', 'pubcomp', 'unsuback'\]
`function(packet) {}`

Emitted when an MQTT `[puback, pubrec, pubrel, pubcomp, unsuback]` packet
is received by the client.

`packet` is an object that may contain the property:

* `messageId`: the ID of the packet

###Event: 'subscribe'
`function(packet) {}`

Emitted when an MQTT subscribe packet is received.

`packet` is an object that may contain the properties:

* `messageId`: the ID of the packet
* `subscriptions`: a list of topics and their requested QoS level, of the form `[{topic: 'a', qos: 0},...]`

###Event: 'suback'
`function(packet) {}`

Emitted when an MQTT suback packet is received.

`packet` is an object that may contain the properties:

* `messageId`: the ID of the packet
* `granted`: a vector of granted QoS levels

###Event: 'unsubscribe'
`function(packet) {}`

Emitted when an MQTT unsubscribe packet is received.

`packet` is an object that may contain the properties:

* `messageId`: the ID of the packet
* `unsubscriptions`: a list of topics the client is unsubscribing from, of the form `[topic1, topic2, ...]`

###Events: \['pingreq', 'pingresp', 'disconnect'\]
`function(packet){}`

Emitted when an MQTT `[pingreq, pingresp, disconnect]` packet is received.

`packet` is an empty object and can be ignored.
