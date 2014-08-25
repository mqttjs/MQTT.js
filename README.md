# mqtt.js [![Build Status](https://travis-ci.org/adamvr/MQTT.js.png)](https://travis-ci.org/adamvr/MQTT.js)

## Introduction

[![NPM](https://nodei.co/npm/mqtt.png)](https://nodei.co/npm/mqtt/)
[![NPM](https://nodei.co/npm-dl/mqtt.png)](https://nodei.co/npm/mqtt/)

mqtt.js is a library for the [MQTT](http://mqtt.org/) protocol, written
in JavaScript to be used in node.js.

## Important notes for existing users

* v0.3.0 improves connection stability, performance, the reconnection
  logic and SSL support. See [#118](https://github.com/adamvr/MQTT.js/pull/118) for
  details. A Connection is a Writable stream, so you can run
  MQTT.js over any kind of Stream (doc needed). Both the constructors of
  MqttClient and MqttConnection changed, but not the factory method
  `mqtt.createClient` and `mqtt.createConnection`.

* v0.2.0 has brough some API breaking changes to mqtt.js. 
  Please consult the [migration guide](http://github.com/adamvr/MQTT.js/wiki/migration) for information
  or open an issue if you need any help.

## Installation

    npm install mqtt

## Example

First you will need to install and run a broker, such as
[Mosquitto](http://mosquitto.org) or
[Mosca](http://mcollina.github.io/mosca/), and launch it.

For the sake of simplicity, let's put the subscriber and the publisher in the same file:
```js
var mqtt = require('mqtt')

client = mqtt.createClient(1883, 'localhost');

client.subscribe('presence');
client.publish('presence', 'Hello mqtt');

client.on('message', function (topic, message) {
  console.log(message);
});

client.end();
```

output:
```
Hello mqtt
```

If you do not want to install a separate broker, you can try using the
[server/orig](https://github.com/adamvr/MQTT.js/blob/master/examples/server/orig.js)
example.
It implements enough of the semantics of the MQTT protocol to
run the example.

## Documentation

Detailed documentation can be found in [the wiki](http://github.com/adamvr/MQTT.js/wiki)

## Client API usage

See: [examples/client](https://github.com/adamvr/MQTT.js/tree/master/examples/client)

### Simple publish client

```js
var mqtt = require('mqtt')
  , client = mqtt.createClient();

client.publish('messages', 'mqtt');
client.publish('messages', 'is pretty cool');
client.publish('messages', 'remember that!', {retain: true});
client.end();
```

### Simple subscribe client

```js
var mqtt = require('mqtt')
  , client = mqtt.createClient();

client.subscribe('messages');
client.publish('messages', 'hello me!');
client.on('message', function(topic, message) {
  console.log(message);
});
client.options.reconnectPeriod = 0;  // disable automatic reconnect
```

### Connect using a URL

Using the connect method, which can create either a normal or secure MQTT client.

```js
var mqtt = require('mqtt')
  , client = mqtt.connect('mqtt://user:pass@localhost?clientId=123abc');

client.subscribe('messages');
client.publish('messages', 'hello me!');
client.on('message', function(topic, message) {
  console.log(message);
});
```

Supports `mqtt://` and `tcp://` for normal connections, and `mqtts://` or `ssl://` for secure connections.

As seen above the `clientId` can be passed in as a query parameter.

### Chainable API!

```js
var mqtt = require('mqtt')
  , client = mqtt.createClient();

client
  .subscribe('messages')
  .publish('presence', 'bin hier')
  .on('message', function(topic, message) {
    console.log(topic);
  });
```

## Server API usage

### Broadcast server example

Included in [examples/broadcast.js](https://github.com/adamvr/MQTT.js/blob/master/examples/server/broadcast.js):

```js
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

    client.suback({granted: granted, messageId: packet.messageId});
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
    console.log('error!', err);

    if (!self.clients[client.id]) return;

    delete self.clients[client.id];
    client.stream.end();
  });
}).listen(1883);
```

## License

MIT
