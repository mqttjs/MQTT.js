var net = require('net'),
	events = require('events'),
	util = require('util')
	protocol = require('./protocol'),
	packet = require('./packet');
	
var Connection = module.exports = function Connection(stream, server) {
	this.server = server;
	this.stream = stream;
	this.buffer = new Buffer(1024);
	this.buffer.written = this.buffer.read = 0;
	this.packet = {};
	this.stream.on('data', this.parse.bind(this));
	/*
	this.stream.on('error', this.error.bind(this));
	this.stream.on('close', this.end.bind(this));
	*/
	events.EventEmitter.call(this);
};

util.inherits(Connection, events.EventEmitter);

Connection.prototype.parse = function(buf) {
	/* Copy incoming data into the internal buffer */
	/* TODO: grow it */

	buf.copy(this.buffer, this.buffer.written);
	this.buffer.written += buf.length;

	var pos = this.buffer.read,
		len = this.buffer.written,
		buf = this.buffer,
		error = '';

	while (pos < len) {
		/* Fresh packet - parse the header */
		if (!this.packet.cmd) {
			var header = protocol.parse_header(buf.slice(pos, pos + 1));
			for (var k in header) {
				this.packet[k] = header[k];
			}
			pos++;
		}

		/* Parse the remaining length field */
		if (!this.packet.length) {
			this.tmp = {mul: 1, length: 0, lenlen: 0};

			do {
				if (pos > len) {
					return;
				}
				if (this.tmp.lenlen) {
					error = 'remaining length field too long'
					break;
				}

				this.tmp.length += this.tmp.mul * (buf[pos] & protocol.LENGTH_MASK);
				this.tmp.mul *= 0x80;
			} while ((buf[pos++] & protocol.LENGTH_FIN_MASK) !== 0);
			
			if (!error) {
			   this.packet.length = this.tmp.length;
			}
		}

		/* Do we have enough data to complete the payload? */
		if (len - pos < this.packet.length) {
		    /* Nope, wait for more data */
			break;
		} else {
			/* We've either got enough for >= 1 packet */
			var parsed = protocol['parse_' + this.packet.cmd](
				this.buffer.slice(pos, this.packet.length + pos));

			for (var k in parsed) {
				this.packet[k] = parsed[k];
			}

			/* Indicate that we've read all the data */
			pos += this.packet.length;

			/* Emit packet and reset connection state */
			this.emit(this.packet.cmd, this.packet);
			this.packet = {};
			this.tmp = {};

		}
	}

	this.buffer.read = pos;
	this.buffer.written = len;

	/* Processed all the data in the buffer, reset pointers */
	if (this.buffer.written === this.buffer.read) {
		this.buffer.written = this.buffer.read = 0;
	}
};

Connection.prototype.connack = function(code) {
	this.stream.write(new Buffer([2 << 4, 2, 0, code]));
}

Connection.prototype.pingresp = function() {
	this.stream.write(new Buffer([13 << 4, 0]))
}

Connection.prototype.publish = function(topic, payload, messageID) {
	var packet = [3 << 4, topic.length + payload.length + 2];
	

	packet.push(topic.length >> 8);
	packet.push(topic.length & 0x0F);
	for(var i = 0; i < topic.length; i++) {
		packet.push(topic[i]);
	}
	
	if(messageID) {
		packet.push(messageID >> 8);
		packet.push(messageID & 0x0F);
	}
	
	for(var i = 0; i < payload.length; i++) {
		packet.push(payload[i]);
	}
	
	this.stream.write(new Buffer(packet));
}

Connection.prototype.suback = function(messageID, granted) {
	var packet = [9 << 4, granted.length + 2, messageID >> 8, messageID & 0x0F];
	for(var i = 0; i < granted.length; i++) {
		packet.push(granted[i]);
	}
	
	this.stream.write(new Buffer(packet));
}

Connection.prototype.error = function(err) {
	this.reset();
	this.emit('error', err);
	this.state = 'fresh';
};

Connection.prototype.reset = function() {
	this.tmp = {};
	this.tmp.mul = 1;
	this.buffer.read = 0;
	this.buffer.written = 0;
	this.packet = {};
	this.packet.length = 0;
};

Connection.prototype.end = function() {
	this.stream.end();
};

/*
var EventEmitter = require('events').EventEmitter,
	e = new EventEmitter(),
	c = new Connection(e),
	o = { version: 'mqisdp',
		  versionNum: 3,
		  client: 'test',
		  keepalive: 60
		},
	buffer = new Buffer(1024),
	packet = packet.gen_connect(o);

console.dir(packet);
buffer.write(packet.toString('utf8'), 0);
buffer.write(packet.toString('utf8'), packet.length);
console.dir(buffer);

c.on('connect', function(packet) {
	console.dir(packet);
});


e.emit('data', buffer.slice(0, packet.length * 2 - 8));
e.emit('data', buffer.slice(packet.length * 2 - 8, packet.length * 2));
*/

net.createServer(function(socket) {
	var conn = new Connection(socket),
		events = ['connect', 'publish', 'subscribe', 'pingreq', 'disconnect'],
		socks = ['connect', 'data', 'end', 'timeout', 'drain', 'error'];

	for (var i = 0; i < events.length; i++) {
		conn.on(events[i], function(packet) {
			console.dir(packet);
		});
	}

	conn.on('connect', function(packet) {
		conn.connack(0);
	});

	conn.on('disconnect', function(packet) {
		conn.stream.end();
	});

}).listen(1883);
