var sys = require("sys");
var net = require("net");
var inspect = require("util").inspect;
var EventEmitter = require("events").EventEmitter;

MQTTClientState = {'New':0, 'Connected':1, 'Error':2}
MQTTPacketType = {'Connect':1, 'Connack':2, 
		  'Publish':3, 'Puback':4, 'Pubrec':5, 'Pubrel':6, 'Pubcomp':7, 
		  'Subscribe':8, 'Suback':9, 'Unsubscribe':10, 'Unsuback':11,
		  'Pingreq':12, 'Pingresp':13,
		  'Disconnect':14};

function MQTTClient(socket) {
    this.clientID = '';
    this.state = MQTTClientState.New;
    this.socket = socket;
    this.buffer = undefined;
    this.packet = {
	'command' : undefined,
	'retain' : undefined,
	'qos' : undefined,
	'dup' : undefined,
	'length' : undefined
    };
}

sys.inherits(MQTTClient, EventEmitter);

MQTTClient.prototype.accumulate = function(data) {
    //var client = this.owner;
    var client = this;

    sys.log("Data received from client at " + client.socket.remoteAddress);
    sys.log(inspect(data));

    /* Are we starting a new packet? */
    if(client.packet.length === undefined) {
	/* Yep, init the packet structure */
	/* TODO: make this a proper object */
	/* TODO: perhaps have MQTTClient store a list of packets, rather than work of a single one */
	client.packet = {
	    'command' : undefined,
	    'retain' : undefined,
	    'qos' : undefined,
	    'dup' : undefined,
	    'length' : undefined
	};
	client.buffer = data;
	sys.log("Starting a new packet");
    } else {
	/* Nope, add the new data to the packet buffer */
	var newSize = client.buffer.length + data.length;
	var newBuf = new Buffer(newSize);
	client.buffer.copy(newBuf);
	data.copy(newBuf, client.buffer.length);
	client.buffer = newBuf;

	sys.log("Appending to existing packet:\n" + inspect(client.buffer));
    }

    var packet = client.packet;


    while(client.buffer.length) {

	if(packet.command === undefined) {
	    packet.command = (client.buffer[0] & 0xF0) >> 4;
	    packet.dup = ((client.buffer[0] & 0x08) == 0x08);
	    packet.qos = (client.buffer[0] & 0x06) >> 2;
	    packet.retain = ((client.buffer[0] & 0x01) != 0);

	    sys.log("Packet info: " + inspect(packet));

	    if(client.state === MQTTClientState.New && packet.command !== MQTTPacketType.Connect) {
		/* New clients need to send connect packets to start with */
		sys.log("Error: new client didn't send a connect packet");
		/* TODO: disconnect the client */
	    }
	}

	if(packet.length === undefined) {
	    /* Starting a new packet */

	    /* See if we have enough data for the header and the longest
	     * possible remaining length fields
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

	    for(var i = 1; i < client.buffer.length; i++) {
		length += (client.buffer[i] & 0x7F) * mul;
		mul *= 0x80;
		
		if(i > 5) {
		    /* Length field too long */
		    sys.log("Error: length field too long");
		    /* TODO: disconnect the client */
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

	if(client.buffer.length >= packet.length) {
	    /* Cut the current packet out of the buffer */
	    var chunk = client.buffer.slice(0, packet.length);

	    /* Do something with it */
	    sys.log("Packet complete\n" + inspect(chunk));
	    packet.body = chunk.slice((packet.lengthLength + 1), chunk.length);
	    packet.lengthLength = undefined;
	    client.process(packet);

	    /* Cut the old packet out of the buffer */
	    client.buffer = client.buffer.slice(packet.length, client.buffer.length);
	    /* We don't know the length of the new packet, so set packet.length to undefined */
	    client.packet.length = undefined;
	    client.packet.command = undefined;
	} else {
	    /* Haven't got the whole packet yet, wait for more data */
	    sys.log("Incomplete packet, bytes needed to complete: " + (packet.length - client.buffer.length));
	    break;
	}
    }
}


MQTTClient.prototype.process = function(packet) {
    switch(packet.command) {
	case MQTTPacketType.Connect:
	    var count = 0;
	    /* Skip the version field */
	    count += "06MQisdp3".length;

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
		/* Move the pointer to the length of the topic + the length of the length of the topic (2) */
		count += topicLen;

		/* What remains in the body is will message */
		packet.willMessage = packet.body.slice(count);
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
	    packet.payload = packet.body.slice(count, packet.body.length);

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
	    for(var i = count; i < packet.length; i++) {
		var tq = {};

		/* Extract the topic name */
		var topicLen = packet.body[count++] << 8;
		topicLen += packet.body[count++];

		tq.topic = packet.body.slice(count, count+topicLen).toString('utf8');
		count += topicLen + 2;

		/* Get the QoS of the subscription */
		tq.qos = packet.body[count++];

		/* Push topic/qos to the list of subscriptions */
		subscriptions.push(tq);
	    }

	    packet.subscriptions = subscriptions;

	    packet.body = undefined;
	    emit('subscribe', packet);
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
	    emit('subscribe', packet);
	    break;
	case MQTTPacketType.Unsuback:
	    break;
	case MQTTPacketType.Pingreq:
	    emit('pingreq', packet); 
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
    var pkt = [MQTTPacketType.Connack<<4, 2, 0, 0];
    var b = new Buffer(pkt);

    this.socket.write(b);
}
    
function MQTTServer() {
    this.server = net.createServer();
    var self = this;
    this.server.on('connection', function(socket) {
	sys.log("Connection from " + socket.remoteAddress);
	
	var client = new MQTTClient(socket);
	socket.on('data', function(data) {
	    client.accumulate(data);
	});

	self.emit('new_client', client);
    });
}

sys.inherits(MQTTServer, EventEmitter);

s = new MQTTServer();
s.server.listen(1883);

list = [];

s.on('new_client', function(client) {
    sys.log("New client emitted");
    list.push(client);
    client.on('connect', function(packet)  {
	sys.log(inspect(packet));
	client.connack(0);
    });

    client.on('publish', function(packet) {
	sys.log(inspect(packet));
    });

    client.on('disconnect', function() {
	this.socket.end();
    });
});
