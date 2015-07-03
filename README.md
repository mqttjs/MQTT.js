![mqtt.js](https://raw.githubusercontent.com/mqttjs/MQTT.js/137ee0e3940c1f01049a30248c70f24dc6e6f829/MQTT.js.png)
=======

[![Build Status](https://travis-ci.org/mqttjs/MQTT.js.png)](https://travis-ci.org/mqttjs/MQTT.js)

[![NPM](https://nodei.co/npm/mqtt.png)](https://nodei.co/npm/mqtt/)
[![NPM](https://nodei.co/npm-dl/mqtt.png)](https://nodei.co/npm/mqtt/)

MQTT.js is a client library for the [MQTT](http://mqtt.org/) protocol, written
in JavaScript for node.js and the browser.

* [Upgrade notes](#notes)
* [Installation](#install)
* [Example](#example)
* [Command Line Tools](#cli)
* [API](#api)
* [Browserify](#browserify)
* [Contributing](#contributing)
* [License](#license)

MQTT.js is an OPEN Open Source Project, see the [Contributing](#contributing) section to find out what this means.

<a name="notes"></a>
## Important notes for existing users

v1.0.0 improves the overall architecture of the project, which is now
split into three components: MQTT.js keeps the Client,
[mqtt-connection](http://npm.im/mqtt-connection) includes the barebone
Connection code for server-side usage, and [mqtt-packet](http://npm.im/mqtt-packet)
includes the protocol parser and generator. The new Client improves
performance by a 30% factor, embeds Websocket support
([MOWS](http://npm.im/mows) is now deprecated), and it has a better
support for QoS 1 and 2. The previous API is still supported but
deprecated, as such, it id not documented in this README.

As a __breaking change__, the `encoding` option in the old client is
removed, and now everything is UTF-8 with the exception of the
`password` in the CONNECT message and `payload` in the PUBLISH message,
which are `Buffer`.

Another __breaking change__ is that MQTT.js now defaults to MQTT v3.1.1,
so to support old brokers, please read the [client options doc](#client).

<a name="install"></a>
## Installation

```sh
npm install mqtt --save
```

<a name="example"></a>
## Example

For the sake of simplicity, let's put the subscriber and the publisher in the same file:

```js
var mqtt    = require('mqtt');
var client  = mqtt.connect('mqtt://test.mosquitto.org');

client.on('connect', function () {
  client.subscribe('presence');
  client.publish('presence', 'Hello mqtt');
});

client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString());
  client.end();
});
```

output:
```
Hello mqtt
```

If you want to run your own MQTT broker, you can use
[Mosquitto](http://mosquitto.org) or
[Mosca](http://mcollina.github.io/mosca/), and launch it.
You can also use a test instance: test.mosquitto.org and test.mosca.io
are both public.

If you do not want to install a separate broker, you can try using the
[server/orig](https://github.com/adamvr/MQTT.js/blob/master/examples/server/orig.js)
example.
It implements enough of the semantics of the MQTT protocol to
run the example.

to use MQTT.js in the browser see the [browserify](#browserify) section

<a name="cli"></a>
## Command Line Tools

MQTT.js bundles a command to interact with a broker.
In order to have it available on your path, you should install MQTT.js
globally:

```sh
npm install mqtt -g
```

Then, on one terminal

```
mqtt sub -t 'hello' -h 'test.mosquitto.org' -v
```

On another

```
mqtt pub -t 'hello' -h 'test.mosquitto.org' -m 'from MQTT.js'
```

See `mqtt help <command>` for the command help.

<a name="api"></a>
## API

  * <a href="#connect"><code>mqtt.<b>connect()</b></code></a>
  * <a href="#client"><code>mqtt.<b>Client()</b></code></a>
  * <a href="#publish"><code>mqtt.Client#<b>publish()</b></code></a>
  * <a href="#subscribe"><code>mqtt.Client#<b>subscribe()</b></code></a>
  * <a href="#unsubscribe"><code>mqtt.Client#<b>unsubscribe()</b></code></a>
  * <a href="#end"><code>mqtt.Client#<b>end()</b></code></a>
  * <a href="#handleMessage"><code>mqtt.Client#<b>handleMessage()</b></code></a>
  * <a href="#store"><code>mqtt.<b>Store()</b></code></a>
  * <a href="#put"><code>mqtt.Store#<b>put()</b></code></a>
  * <a href="#del"><code>mqtt.Store#<b>del()</b></code></a>
  * <a href="#createStream"><code>mqtt.Store#<b>createStream()</b></code></a>
  * <a href="#close"><code>mqtt.Store#<b>close()</b></code></a>

-------------------------------------------------------
<a name="connect"></a>
### mqtt.connect([url], options)

Connects to the broker specified by the given url and options and
returns a [Client](#client).

The URL can be on the following protocols: 'mqtt', 'mqtts', 'tcp',
'tls', 'ws', 'wss'. The URL can also be an object as returned by
[`URL.parse()`](http://nodejs.org/api/url.html#url_url_parse_urlstr_parsequerystring_slashesdenotehost),
in that case the two objects are merged, i.e. you can pass a single
object with both the URL and the connect options.

You can also specify a `servers` options with content: `[{ host:
'localhost', port: 1883 }, ... ]`, in that case that array is iterated
at every connect.

For all MQTT-related options, see the [Client](#client)
constructor.

-------------------------------------------------------
<a name="client"></a>
### mqtt.Client(streamBuilder, options)

The `Client` class wraps a client connection to an
MQTT broker over an arbitrary transport method (TCP, TLS,
WebSocket, ecc).

`Client` automatically handles the following:

* Regular server pings
* QoS flow
* Automatic reconnections
* Start publishing before being connected

The arguments are:

* `streamBuilder` is a function that returns a subclass of the `Stream` class that supports
the `connect` event. Typically a `net.Socket`.
* `options` is the client connection options (see: the [connect packet](https://github.com/mcollina/mqtt-packet#connect)). Defaults:
  * `keepalive`: `10` seconds, set to `0` to disable
  * `clientId`: `'mqttjs'_ + crypto.randomBytes(16).toString('hex')`
  * `protocolId`: `'MQTT'`
  * `protocolVersion`: `4`
  * `clean`: `true`, set to false to receive QoS 1 and 2 messages while
    offline
  * `reconnectPeriod`: `1000` milliseconds, interval between two
    reconnections
  * `connectTimeout`: `30 * 1000` milliseconds, time to wait before a
    CONNACK is received
  * `username`: the username required by your broker, if any
  * `password`: the password required by your broker, if any
  * `incomingStore`: a [Store](#store) for the incoming packets
  * `outgoingStore`: a [Store](#store) for the outgoing packets
  * `will`: a message that will sent by the broker automatically when
     the client disconnect badly. The format is:
    * `topic`: the topic to publish
    * `payload`: the message to publish
    * `qos`: the QoS
    * `retain`: the retain flag

In case mqtts (mqtt over tls) is required, the `options` object is
passed through to
[`tls.connect()`](http://nodejs.org/api/tls.html#tls_tls_connect_options_callback).
If you are using a **self-signed certificate**, pass the `rejectUnauthorized: false` option.
Beware that you are exposing yourself to man in the middle attacks, so it is a configuration
that is not recommended for production environments.

If you are connecting to a broker that supports only MQTT 3.1 (not
3.1.1 compliant), you should pass these additional options:

```js
{
  protocolId: 'MQIsdp',
  protocolVersion: 3
}
```

This is confirmed on RabbitMQ 3.2.4, and on Mosquitto < 1.3. Mosquitto
version 1.3 and 1.4 works fine without those.

#### Event `'connect'`

`function() {}`

Emitted on successful (re)connection (i.e. connack rc=0).

#### Event `'reconnect'`

`function() {}`

Emitted when a reconnect starts.

#### Event `'close'`

`function() {}`

Emitted after a disconnection.

#### Event `'offline'`

`function() {}`

Emitted when the client goes offline.

#### Event `'error'`

`function(error) {}`

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs.

### Event `'message'`

`function(topic, message, packet) {}`

Emitted when the client receives a publish packet
* `topic` topic of the received packet
* `message` payload of the received packet
* `packet` received packet, as defined in
  [mqtt-packet](https://github.com/mcollina/mqtt-packet#publish)

-------------------------------------------------------
<a name="publish"></a>
### mqtt.Client#publish(topic, message, [options], [callback])

Publish a message to a topic

* `topic` is the topic to publish to, `String`
* `message` is the message to publish, `Buffer` or `String`
* `options` is the options to publish with, including:
  * `qos` QoS level, `Number`, default `0`
  * `retain` retain flag, `Boolean`, default `false`
* `callback` callback fired when the QoS handling completes,
  or at the next tick if QoS 0.

-------------------------------------------------------
<a name="subscribe"></a>
### mqtt.Client#subscribe(topic/topic array/topic object, [options], [callback])

Subscribe to a topic or topics

* `topic` is a `String` topic to subscribe to or an `Array` of
  topics to subscribe to. It can also be an object, it has as object
  keys the topic name and as value the QoS, like `{'test1': 0, 'test2': 1}`.
* `options` is the options to subscribe with, including:
  * `qos` qos subscription level, default 0
* `callback` - `function(err, granted)`
  callback fired on suback where:
  * `err` a subscription error
  * `granted` is an array of `{topic, qos}` where:
    * `topic` is a subscribed to topic
    * `qos` is the granted qos level on it

-------------------------------------------------------
<a name="unsubscribe"></a>
### mqtt.Client#unsubscribe(topic/topic array, [options], [callback])

Unsubscribe from a topic or topics

* `topic` is a `String` topic or an array of topics to unsubscribe from
* `callback` fired on unsuback

-------------------------------------------------------
<a name="end"></a>
### mqtt.Client#end([force], [cb])

Close the client, accepts the following options:

* `force`: passing it to true will close the client right away, without
  waiting for the in-flight messages to be acked. This parameter is
  optional.
* `cb`: will be called when the client is closed. This parameter is
  optional.

-------------------------------------------------------
<a name="handleMessage"></a>
### mqtt.Client#handleMessage(packet, callback)

Handle messages with backpressure support, one at a time.
Override at will, but __always call `callback`__, or the client
will hang.

-------------------------------------------------------
<a name="store"></a>
### mqtt.Store()

In-memory implementation of the message store.

Another implementaion is
[mqtt-level-store](http://npm.im/mqtt-level-store) which uses
[Level-browserify](http://npm.im/level-browserify) to store the inflight
data, making it usable both in Node and the Browser.

-------------------------------------------------------
<a name="put"></a>
### mqtt.Store#put(packet, callback)

Adds a packet to the store, a packet is
anything that has a `messageId` property.
The callback is called when the packet has been stored.

-------------------------------------------------------
<a name="createStream"></a>
### mqtt.Store#createStream()

Creates a stream with all the packets in the store.

-------------------------------------------------------
<a name="del"></a>
### mqtt.Store#del(packet, cb)

Removes a packet from the store, a packet is
anything that has a `messageId` property.
The callback is called when the packet has been removed.

-------------------------------------------------------
<a name="close"></a>
### mqtt.Store#close(cb)

Closes the Store.

<a name="browserify"></a>
## Browserify

In order to use MQTT.js as a browserify module you can either require it in your browserify bundles or build it as a stand alone module. The exported module is AMD/CommonJs compatible and it will add an object in the global space.

```javascript
npm install -g browserify // install browserify
cd node_modules/mqtt
npm install . // install dev dependencies
browserify mqtt.js -s mqtt > browserMqtt.js // require mqtt in your client-side app
```

you can then use mqtt.js in the browser with the same api than node's one.

```html
<html>
<head>
  <title>test Ws mqtt.js</title>
</head>
<body>
<script src="./browserMqtt.js"></script>
<script>
      var client = mqtt.connect(); // you add a ws:// url here
      client.subscribe("mqtt/demo");

      client.on("message", function(topic, payload) {
        alert([topic, payload].join(": "));
        client.end();
      });

      client.publish("mqtt/demo", "hello world!");
    </script>
</body>
</html>
```

Your broker should accept websocket connection (see [MQTT over Websockets](https://github.com/mcollina/mosca/wiki/MQTT-over-Websockets) to setup [Mosca](http://mcollina.github.io/mosca/)).

<a name="contributing"></a>
## Contributing

MQTT.js is an **OPEN Open Source Project**. This means that:

> Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

See the [CONTRIBUTING.md](https://github.com/mqttjs/MQTT.js/blob/master/CONTRIBUTING.md) file for more details.

### Contributors

MQTT.js is only possible due to the excellent work of the following contributors:

<table><tbody>
<tr><th align="left">Adam Rudd</th><td><a href="https://github.com/adamvr">GitHub/adamvr</a></td><td><a href="http://twitter.com/adam_vr">Twitter/@adam_vr</a></td></tr>
<tr><th align="left">Matteo Collina</th><td><a href="https://github.com/mcollina">GitHub/mcollina</a></td><td><a href="http://twitter.com/matteocollina">Twitter/@matteocollina</a></td></tr>
</tbody></table>

<a name="license"></a>
## License

MIT
