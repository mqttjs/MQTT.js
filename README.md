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
* [Contributing](#contributing)
* [License](#license)

MQTT.js is an OPEN Open Source Project, see the [Contributing](#contributing) section to find out what this means.

<a name="notes"></a>
Important notes for existing users
----------------------------------

v1.0.0 improves the overall architecture of the project, which is now
splitted in three components: MQTT.js keeps the Client,
[mqtt-connection](http://npm.im/mqtt-connection) includes the barebone
Connection code for server-side usage, and [mqtt-packet](http://npm.im/mqtt-packet)
includes the protocol parser and generator. The new Client improves
performance by a 30% factor, embeds Websocket support
([MOWS](http://npm.im/mows) is now deprecated), and it has a better
support for QoS 1 and 2. The previous API is still supported but
deprecated, as such, it id not documented in this README.

As a __breaking change__, the `encoding` option in the old client is
removed, and now everything is UTF-8 with the exception of the
`password` in the CONNECT message and `payload` in the PUBLISH message.

<a name="install"></a>
Installation
------------

```sh
npm install mqtt --save
```

<a name="example"></a>
Example
-------

For the sake of simplicity, let's put the subscriber and the publisher in the same file:

```js
var mqtt    = require('mqtt');
var client  = mqtt.connect('mqtt://test.mosquitto.org');

client.subscribe('presence');
client.publish('presence', 'Hello mqtt');

client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString());
});

client.end();
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

<a name="cli"></a>
Command Line Tools
------------------

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
API
---

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
  * `incomingStore`: a [Store](#store) for the incoming packets
  * `outgoingStore`: a [Store](#store) for the outgoing packets

In case mqtts (mqtt over tls) is required, the `options` object is
passed through to
[`tls.connect()`](http://nodejs.org/api/tls.html#tls_tls_connect_options_callback).

#### Event `'connect'`

`function() {}`

Emitted on successful (re)connection (i.e. connack rc=0).

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

Emitted when the client recieves a publish packet
* `topic` topic of the received packet
* `message` payload of the received packet
* `packet` received packet, as defined in
  [mqtt-packet](https://github.com/mcollina/mqtt-packet#publish)

-------------------------------------------------------
<a name="publish"></a>
### mqtt.Client#publish(topic, payload, [options])

Publish a message

* `topic` is the topic to publish to, `String`
* `message` is the message to publish, `Buffer` or `String`
* `options` is the options to publish with, including:
  * `qos` qos level, default `0`
  * `retain` retain flag, default `false`
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
### mqtt.Client#end(cb)

Close the client, calls `callback` when finished.

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

<a name="contributing"></a>
Contributing
------------

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
License
-------

MIT
