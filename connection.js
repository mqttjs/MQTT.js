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

	this.on('disconnect', function(packet) {
		this.stream.end();
	});

	var evs = ['close', 'error'];

	for (var i = 0; i < evs.length; i++) {
		this.stream.on(evs[i], function(conn, event) {
			return function(e) {
				conn.stream.end();
				conn.emit(event, e);
			}
		}(this, evs[i]));
	}
	
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

for (var k in protocol.types) {
	var v = protocol.types[k];

	Connection.prototype[v] = function(type) {
		return function(opts) {
			var p = packet['gen_'+type](opts);

			return p ? this.stream.write(p) : null;
		}
	}(v);
}

/*
Connection.prototype.connack = function(returnCode) {
	var p = packet.gen_connack({returnCode: returnCode});

	return p ? this.stream.write(p) : null;
};

Connection.prototype.pingresp = function() {
	var p = packet.gen_pingresp();

	return p ? this.stream.write(p) : null;
};

Connection.prototype.publish = function(topic, payload, messageId) {
	var p = packet.gen_publish({topic: topic,
							   payload: payload,
							   messageId: messageId}); 

	return p ? this.stream.write(p) : null;

};

Connection.prototype.suback = function(messageId, granted) {
	var p = packet.gen_suback({granted: granted,
							   messageId: messageId}); 

	return p ? this.stream.write(p) : null;
}
*/

