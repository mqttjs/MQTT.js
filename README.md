MQTT.js
=======

Introduction
------------
MQTT.js is a server library for the MQTT protocol, written in node.js.

The idea of this project is to allow many different
breeds of publish/subscribe, rather than the straight
topic hierarchies that basic MQTT provides.

Some (sane) examples:

* Subscribing to regular expressions and receiving
messages on topics matching that regular expression
* CouchDB query style subscriptions
* Content based publish/subscribe using regular
expressions
* Subscriptions using AWK scripts

Some (less sane) examples:

*   Publishers publish image data which is processed for
    face detection. Subscribers subscribe to a face and
    get delivered the published image data if their face
    appears in the image
*   Publishers publish MP3s. The published message is
    processed to determine the musical key of the published
    audio. Subscribers subscribe to a given musical key
    and receive the audio if the published audio is in that
    key.

How to get something useful up and running
------------------------------------------

1. Install [node](http://github.com/joyent/node.js)
2. Get MQTT.js

	`git clone http://github.com/adamvr/mqtt.js.git`

3. `cd examples/`
4. Run an example server using

	`node <server>.js`
    
Library usage example
---------------------

    MQTTServer = require("./mqtt").MQTTServer
    s = new MQTTServer();
    s.on('new_client', function(client) {
	client.on('connect', function(packet) {
	    client.connack(0);
	});

	client.on('publish', function(packet) {
	    client.publish(packet.topic, packet.payload);
	});

	client.on('subscribe', function(packet) {
	    // See examples
	    client.suback(packet.messageId, []);
	});

	client.on('disconnect', function(packet) {
	    // Goodbye!
	});

	client.on('error', function(error) {
	    // Error!
	});
    });

    s.server.listen(1883);

Caveats
-------

At this point, MQTT.js is fairly flakey and still has some unresolved problems.
Some known ones are:

*	Poor handling (i.e. crashing) if partial packets are received.
*	Poor handling of socket errors.
*	Lack of documentation. 
*	Not quite as nice an API as you might like.
*	Not nearly as catchy a name as mosquitto.

