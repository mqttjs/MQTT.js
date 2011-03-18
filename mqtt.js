var sys = require("sys");
var net = require("net");
var inspect = require("util").inspect;
var EventEmitter = require("events").EventEmitter;

/* Major TODO:
 * 1. Insert error checking code around clientID/topic name slices.
 *    These are notorious for crashing the program if the length is too long
 * 2. Ship MQTTClient and its helpers to an external module
 * 3. Make client.packet a proper object (i.e. with a constructor and
 *    well specified)
 * 4. Figure out if one packet is OK for each client
 * 5. Related: cut the cruft out of the packets that are returned
 *    to the library users (fields like lenLen, length, body...).
 *    They should only really contain the packet type and the
 *    fields corresponding to the packet
 * 6. Break client.accumulate (and client.process)
 *    into a bunch of subroutines for
 *    easier unit testing
 * 7. Do up some manner of testing framework.
 *    (but the lifeboats make the deck look crowded!)
 * 8. Standardise packet construction i.e. make functions that
 *    return packets rather than generating them in client.sendPacket
 * 9. Catch error or disconnect events from sockets and process them rather than
 *    letting them bubble up to the reactor
 * 10.Disconnect clients after a timeout period equal to their keepalive
 *    if they have one or 10 seconds if they don't
 * 11.Consider tying MQTTClient.process to an event emitted by 
 *    MQTTClient.accumulate, rather than having accumulate directly call it
 */

MQTTPacketType = {'Connect':1, 'Connack':2, 
		  'Publish':3, 'Puback':4, 'Pubrec':5, 'Pubrel':6, 'Pubcomp':7, 
		  'Subscribe':8, 'Suback':9, 'Unsubscribe':10, 'Unsuback':11,
		  'Pingreq':12, 'Pingresp':13,
		  'Disconnect':14};

function MQTTClient(socket) {
    this.clientID = '';
    this.socket = socket;
    this.buffer = new Buffer(0);
    this.subscriptions = [];
    this.packet = undefined;

    var self = this;

    this.socket.on('data', function(data) {
	self.accumulate(data);
    });

    this.on('packet_received', function(packet) {
	this.process(packet);
    });

    /* TODO: consider catching the socket timeout event */

    this.socket.on('error', function(exception) {
	self.emit('error', exception);
    });

    /* Arguably this is an error if it doesn't come
     * after a disconnect packet */
    /* YEAH, I CLOSED THE CONNECTION WITHOUT SENDING A DISCONNECT
     * WHAT ARE YOU GONNA DO ABOUT IT?
     * DISCONNECT ME?
     */
    this.socket.on('close', function(had_error) {
	self.emit('close');
    });
}

sys.inherits(MQTTClient, EventEmitter);

MQTTClient.prototype.accumulate = function(data) {
    /* Hurr hurr hurr, thanks javascript! */
    /* Also, refactoring is for losers */
    /* Being in javascript means never having to admit that you're wrong */
    var client = this;

    sys.log("Data received from client at " + client.socket.remoteAddress);
    sys.log(inspect(data));

    /* Add the incoming data to the client's data buffer */
    var newSize = client.buffer.length + data.length;
    var newBuf = new Buffer(newSize);
    client.buffer.copy(newBuf);
    data.copy(newBuf, client.buffer.length);
    client.buffer = newBuf;

    sys.log("Adding data to buffer:\n" + inspect(client.buffer));

    /* Process all the data in the buffer */
    while(client.buffer.length) {

	var packet;
	
	/* Throw away the packet after, let's say, 5 seconds */
	/* Consider emitting an error here, this suggests that
	 * the client is either defective or is having 
	 * network troubles of some kind.
	 *
	 * Either way, we don't like your type around here.
	 */
	/* Oh, and consider moving this to a proper function. */
	client.packetTimer = setTimeout(function(client) {
	    client.packet = undefined;
	    sys.log('Discarding incomplete packet');
	}, 5000, this);
	    
	if(client.packet === undefined) {
	    /* Starting a new packet */

	    /* Fill the new packet with crap */
	    client.packet = {
		'command':undefined,
		'dup':undefined,
		'qos':undefined,
		'retain':undefined,
		'length':undefined
	    };

	    /* Fill out the header fields */
	    /* TODO: AND HOPE TO GOD THAT WE GOT AT LEAST ONE BYTE */
	    if(client.packet.command === undefined) {
		client.packet.command = (client.buffer[0] & 0xF0) >> 4;
		client.packet.dup = ((client.buffer[0] & 0x08) == 0x08);
		client.packet.qos = (client.buffer[0] & 0x06) >> 2;
		client.packet.retain = ((client.buffer[0] & 0x01) != 0);

		sys.log("Packet info: " + inspect(client.packet));
	    }

	    /* Because refactoring is for losers */
	    /* For convenience, set packet to client.packet */
	    packet = client.packet;

	    /* See if we have enough data for the header and the
	     * shortest possible remaining length field
	     */
	    if(client.buffer.length < 2) {
		/* Haven't got enough data for a new packet */
		/* Wait for more */
		sys.log("Incomplete packet received, waiting for more data");
		break;
	    }

	    /* Calculate the length of the packet */
	    var length = 0;
	    var mul = 1;
	    var gotAll = false;

	    /* TODO: a lot of this crap should be in utility functions.
	     * TODO: learn to modularise, dolt!
	     */
	    for(var i = 1; i < client.buffer.length; i++) {
		length += (client.buffer[i] & 0x7F) * mul;
		mul *= 0x80;
		
		if(i > 5) {
		    /* Length field too long */
		    sys.log("Error: length field too long");
		    /* TODO: disconnect the client */
		    /* TODO: or, better yet, emit an error! */
		    return;
		}

		/* Reached the last length byte */
		if(!(client.buffer[i] & 0x80)) {
		    gotAll = true;
		    break;
		}
	    }

	    /* Haven't got the whole of the length field yet, wait for more data */
	    if(!gotAll) {
		sys.log("Incomplete length field");
		break;
	    }

	    /* The size of the header + the size of the remaining length
	     * + the length of the body of the packet */
	    packet.length = 1 + i + length;
	    packet.lengthLength = i;
	    sys.log("Length calculated: " + packet.length);
	}

	/* Ok, we have enough data to get the length of the packet
	 * Now see if we have all the data to complete the packet
	 */
	if(client.buffer.length >= client.packet.length) {
	    /* Cut the current packet out of the buffer */
	    var chunk = client.buffer.slice(0, client.packet.length);

	    /* Do something with it */
	    sys.log("Packet complete\n" + inspect(chunk));
	    /* Cut the body of the packet out of the buffer */
	    packet.body = chunk.slice((client.packet.lengthLength + 1), chunk.length);
	    /* TODO */
	    /* This doesn't quite do what I want it to, perhaps consider creating
	     * a sanitised packet before handing it off to process
	     */
	    /* By that I mean that it doesn't 'undefine' lengthLength. It remains
	     * in the object with the value 'undefined'
	     */
	    client.packet.lengthLength = undefined;

	    /* Drive client.process() off the packet_received event */
	    /* More events can't hurt, right? */
	    client.emit('packet_received', packet);
	    //
	    //client.process(packet);

	    /* We've got a complete packet, stop the incomplete packet timer */
	    clearTimeout(client.packetTimer);

	    /* Cut the old packet out of the buffer */
	    client.buffer = client.buffer.slice(client.packet.length, client.buffer.length);
	    /* Throw away the old packet */
	    client.packet = undefined;
	} else {
	    /* Haven't got the whole packet yet, wait for more data */
	    sys.log("Incomplete packet, bytes needed to complete: " + (client.packet.length - client.buffer.length));
	    break;
	}
    }
}


MQTTClient.prototype.process = function(packet) {
    switch(packet.command) {
	case MQTTPacketType.Connect:
	    var count = 0;

	    var version = "\00\06MQIsdp\03";
	    if(packet.body.slice(count, count+version.length).toString('utf8') !== version) {
		sys.log('Invalid version');
		emit('error', 'Invalid version string');
	    }

	    /* Skip the version field */
	    count += version.length;


	    sys.log("Count after version string: " + count);

	    /* Extract the connect header */
	    packet.willRetain = (packet.body[count] & 0x20 != 0);
	    packet.willQos = (packet.body[count] & 0x18) >> 3;
	    packet.willFlag = (packet.body[count] & 0x04 != 0);
	    packet.cleanStart = (packet.body[count] & 0x02 != 0);
	    // TODO: add some error detection here e.g. qos = 1 when flag = false isn't allowed
	    count++;

	    sys.log("Count after connect header "+ count);

	    /* Extract the keepalive */
	    packet.keepalive = packet.body[count++] << 8;
	    packet.keepalive += packet.body[count++];

	    sys.log("Count after keepalive "+ count);
	    
	    /* Extract the client ID */
	    var clientLen = packet.body[count++] * 256;
	    clientLen += packet.body[count++];
	    sys.log("Count after client length " + count);
	    sys.log("Client ID length: " + clientLen);
	    sys.log("Body length: " + packet.body.length);
	    packet.clientId = packet.body.slice(count, count+clientLen).toString('utf8');
	    count += clientLen + 2;

	    /* Extract the will topic/message */
	    if(packet.willFlag) {
		/* Calculate the length of the topic string */
		var topicLen = packet.body[count++] << 8;
		topicLen += packet.body[count++];
		/* Cut the topic string out of the buffer */
		packet.willTopic = packet.body.slice(count, count+topicLen).toString('utf8');
		/* Move the pointer to after the topic string */
		count += topicLen;

		/* What remains in the body is will message */
		packet.willMessage = packet.body.slice(count, packet.body.length);
	    }

	    /* Clear the body as to not confuse the guy on the other end */
	    packet.body = undefined;

	    // TODO: consider hiding this in the library and only exposing publish/subscribes
	    this.emit('connect', packet);
	    break;
	case MQTTPacketType.Connack:
	    break;
	case MQTTPacketType.Publish:
	    var count = 0;
	    /* Extract the topic name */
	    var topicLen = packet.body[count++] * 256;
	    topicLen += packet.body[count++];

	    packet.topic = packet.body.slice(count, count+topicLen).toString('utf8');
	    count += topicLen;

	    /* Extract the message ID if appropriate (i.e. if QoS > 0) */
	    if(packet.qos > 0) {
		var messageId = packet.body[count++] << 8;
		messageId += packet.body[count++];
		
		packet.messageId = messageId;
	    }

	    /* Whatever remains is the payload */
	    packet.payload = packet.body.slice(count, packet.body.length).toString('utf8');

	    packet.body = undefined;

	    this.emit('publish', packet);
	    break;
	case MQTTPacketType.Puback:
	    break;
	case MQTTPacketType.Pubrec:
	    break;
	case MQTTPacketType.Pubrel:
	    var count = 0;
	    /* Extract the message ID */
	    var messageId = packet.body[count++] << 8;
	    messageId += packet.body[count++];
	    packet.messageId = messageId;

	    packet.body = undefined;
	    emit('pubrel', packet);
	    break;
	case MQTTPacketType.Pubcomp:
	    break;
	case MQTTPacketType.Subscribe:
	    var count = 0;
	    /* Extract the message ID */
	    var messageId = packet.body[count++] << 8;
	    messageId += packet.body[count++];
	    packet.messageId = messageId;

	    var subscriptions = [];
	    while(count < packet.body.length) {
		var tq = {};

		/* Extract the topic name */
		var topicLen = packet.body[count++] << 8;
		topicLen += packet.body[count++];

		tq.topic = packet.body.slice(count, count+topicLen).toString('utf8');
		count += topicLen;

		/* Get the QoS of the subscription */
		tq.qos = packet.body[count++];

		/* Push topic/qos to the list of subscriptions */
		subscriptions.push(tq);
	    }

	    packet.subscriptions = subscriptions;

	    packet.body = undefined;
	    this.emit('subscribe', packet);
	    break;
	case MQTTPacketType.Suback:
	    break;
	case MQTTPacketType.Unsubscribe:
	    var count = 0;
	    /* Extract the message ID */
	    var messageId = packet.body[count++] << 8;
	    messageId += packet.body[count++];
	    packet.messageId = messageId;

	    var unsubscriptions = [];
	    for(var i = count; i < packet.length; i++) {
		var t = {};

		/* Extract the topic name */
		var topicLen = packet.body[count++] << 8;
		topicLen += packet.body[count++];

		t.topic = packet.body.slice(count, count+topicLen).toString('utf8');
		count += topicLen + 2;

		/* Push topic/qos to the list of subscriptions */
		unsubscriptions.push(t);
	    }

	    packet.unsubscriptions = unsubscriptions;

	    packet.body = undefined;
	    this.emit('unsubscribe', packet);
	    break;
	case MQTTPacketType.Unsuback:
	    break;
	case MQTTPacketType.Pingreq:
	    this.emit('pingreq', packet); 
	    break;
	case MQTTPacketType.Pingresp:
	    break;
	case MQTTPacketType.Disconnect:
	    this.emit('disconnect', packet);
	    break;
	default:
	    sys.log("Invalid packet type");
    }
}

MQTTClient.prototype.connack = function(rc) {
    sys.log('Connacking');
    var pkt = [MQTTPacketType.Connack<<4, 2, 0, rc];
    var b = new Buffer(pkt);

    sys.log("Connack packet " + inspect(b));

    this.socket.write(b);
}

MQTTClient.prototype.suback = function(messageId, qos) {
    sys.log('Subacking');
    var pkt = [MQTTPacketType.Suback<<4];
    /* Message id + length of qos array */
    var pktLen = 2 + qos.length;

    /* Calculate the packet length and push it to the packet */
    do {
	var digit = pktLen % 128
	pktLen = parseInt(pktLen / 128);
	if(pktLen > 0) {
	    digit = digit | 0x80;
	}
	pkt.push(digit);
    } while(pktLen > 0);

    /* Push the  message ID to the packet */
    pkt.push(messageId >> 8);
    pkt.push(messageId & 0xFF);

    /* Push the granted QoS levels to the packet */
    for(var i = 0; i < qos.length; i++) {
	pkt.push(qos[i]);
    }
    sys.log("Suback packet " + inspect(new Buffer(pkt)));

    this.socket.write(new Buffer(pkt));
}

MQTTClient.prototype.publish = function(topic, payload) {
    // TODO: this probably only supports QoS 0
    sys.log('Publishing topic: ' + topic + ' payload: ' + payload);

    var pkt = [MQTTPacketType.Publish << 4];
    /* Length of the topic + length of the length of the topic (2) + the length of the payload */
    var pktLen = topic.length + 2 + payload.length;

    /* Calculate the packet length and push it to the packet */
    do {
	var digit = pktLen % 128
	pktLen = parseInt(pktLen / 128);
	if(pktLen > 0) {
	    digit = digit | 0x80;
	}
	pkt.push(digit);
    } while(pktLen > 0);

    /* Push the topic length to the packet */
    pkt.push(topic.length >> 8);
    pkt.push(topic.length & 0xFF);

    /* Push the topic to the packet */
    for(var i = 0; i < topic.length; i++) {
	pkt.push(topic.charCodeAt(i));
    }

    /* Push the payload to the packet */
    for(var i = 0; i < payload.length; i++) {
	pkt.push(payload.charCodeAt(i));
    }

    sys.log("Publishing packet " + inspect(new Buffer(pkt)));

    /* Send the packet */
    this.socket.write(new Buffer(pkt));
}

MQTTClient.prototype.pingresp = function() {
    sys.log('Pinging');

    var pkt = [MQTTPacketType.Pingresp << 4, 0];
    sys.log('Ping packet: ' + inspect(new Buffer(pkt)));

    this.socket.write(new Buffer(pkt));
}

function MQTTServer() {
    this.server = net.createServer();
    var self = this;
    this.server.on('connection', function(socket) {
	sys.log("Connection from " + socket.remoteAddress);

	client = new MQTTClient(socket);

	self.emit('new_client', client);
    });
}

sys.inherits(MQTTServer, EventEmitter);

s = new MQTTServer();
s.server.listen(1883, "::1");

list = [];

s.on('new_client', function(client) {
    sys.log("New client emitted");
    list.push(client);
    client.on('connect', function(packet)  {
	sys.log(inspect(packet));
	client.connack(0);
    });

    client.on('publish', function(packet) {
	sys.log("Publish packet: " + inspect(packet));
	for(var i = 0; i < list.length; i++) {
	    list[i].publish(packet.topic,packet.payload);
	}
    });

    client.on('subscribe', function(packet) {
	var qos = [];
	for(var i = 0; i < packet.subscriptions; i++) {
	    qos.push(packet.subscriptions[i].qos);
	}

	client.suback(packet.messageId, qos);
    });

    client.on('pingreq', function(packet) {
	client.pingresp();
    });

    client.on('disconnect', function() {
	sys.log('Disconnect');
	this.socket.end();
	list = list.filter(function(x) {
	    if(x === client) {
		return false;
	    } else {
		return true;
	    }
	});
    });

    client.on('error', function(err) {
	sys.log('Error: ' + err);
	this.socket.end();
	list = list.filter(function(x) {
	    if(x === client) {
		return false;
	    } else {
		return true;
	    }
	});
    });

});
