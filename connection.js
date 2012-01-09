var net = require('net'),
	events = require('events'),
	util = require('util')
	protocol = require('./protocol'),
	packet = require('./packet');
	
var Connection = module.exports = function Connection(stream, server) {
	this.server = server;
	this.stream = stream;
	this.buffer = new Buffer(1024);
	this.buffer.pos = 0;
	this.state = 'fresh';
	this.stream.on('data', this.parse.bind(this));
	this.stream.on('error', this.error.bind(this));
	this.stream.on('close', this.end.bind(this));
	events.EventEmitter.call(this);
};

util.inherits(Connection, events.EventEmitter);

Connection.prototype.parse = function(buf) {
	var pos = 0,
		len = buf.length;
		
	while(pos < len) {
		switch(this.state) {
			/* Empty buffer */
			case 'fresh':
				this.reset();
				this.state = 'header';
				break;
			
			/* Parse header */
			case 'header':
				this.packet.cmd = protocol.types[buf[pos] >> protocol.CMD_SHIFT];
				this.packet.retain = (buf[pos] & protocol.RETAIN_MASK) !== 0;
				this.packet.qos = (buf[pos] & protocol.QOS_MASK) >> protocol.QOS_SHIFT;
				this.packet.dup = (buf[pos] & protocol.DUP_MASK) !== 0;
				
				pos++;
				this.state = 'length';
				break;
				
			/* Accumulate remaining length field */
			case 'length':
				if(this.tmp.lenlen > 4) {
					this.state = 'error'
					this.tmp.error = 'length field too long';
					break;
				}
				
				this.packet.length += this.tmp.mul * (buf[pos] & protocol.LENGTH_MASK);
				this.tmp.mul *= 0x80;
				if((buf[pos++] & protocol.LENGTH_FIN_MASK) === 0) this.state = 'accumulate';
				break;

			/* Accumulate data until we've got enough to satisfy the remaining length field */
			case 'accumulate':
				var accumulated = this.buffer.written - this.buffer.read,
					available = len - pos,
					remaining = this.packet.length - accumulated,
					toCopy = 0;
				
				/* If the amount of available data is greater than that needed to
				 * complete the packet, copy only the data that is required to complete the packet.
				 * Otherwise, copy all of the available data.
			     */
				if(available > remaining) {
					toCopy = remaining;
				} else {
					toCopy = available;
				}
				
				
				buf.copy(this.buffer, this.buffer.written, pos, pos + toCopy);
				this.buffer.written += toCopy;
				
				/* Have we got enough to complete the packet? */
				if(this.buffer.written - this.buffer.read >= this.packet.length)  {
					/* Parse the packet */
					this.state = 'packet';
				} else {
					/* Wait for more */
					pos += toCopy;
				}
				break;
			
			
			case 'packet':
				var parsed = protocol['parse_' + this.packet.cmd](this.buffer.slice(this.buffer.read, this.buffer.written));
				if(parsed === null) {
					this.state = 'error'
					this.tmp.error = 'error parsing packet body';
				} else {
					for(var k in parsed) {
						this.packet[k] = parsed[k];
					}
					this.state = 'complete';
				}	
				break;
				
			case 'complete':
				this.emit(this.packet.cmd, this.packet);
				this.state = 'fresh';
				
				this.buffer.read += this.packet.length;
				pos += this.packet.length;
				
				break;
			
			case 'error':
				this.error(this.tmp.error);
				pos = len;
				break;
				
		}
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

var EventEmitter = require('events').EventEmitter,
	e = new EventEmitter(),
	c = new Connection(e),
	packets = [packet.gen_connect({version: 'mqisdp', versionNum: 3, client: 'test', keepalive: 60})];
	
for(var i = 0; i < packets.length; i++) {
	e.emit('data', packets[i]);
}


/*
var redis = require('redis');
var server = net.createServer(function(conn) {
	var client = new Connection(conn, server);
	client.redis = redis.createClient();
	
	var events = ['connect', 'publish', 'subscribe', 'pingreq', 'disconnect'];
	for (var i=0; i < events.length; i++) {
		client.on(events[i], console.dir);
	};
	
	client.stream.on('close', function() { console.log('dc');});
	
	client.on('connect', function(p) {
		client.connack(0);
	});
	
	client.on('publish', function(p) {
		client.redis.publish(p.topic, p.payload);
	});
	
	client.on('subscribe', function(p) {
		var granted = [];
		for(var i = 0; i < p.subscriptions.length; i++) {
			var qos = p.subscriptions[i][1],
				topic = p.subscriptions[i][0];
				
			granted.push(qos);
			client.redis.psubscribe(topic
				.replace('+', '[^/]')
				.replace('#', '*'));
		}
		
		client.suback(p.messageID, granted);
	});
	
	client.on('pingreq', function(p) {
		client.pingresp();
	});
	
	client.redis.on('pmessage', function(pattern, channel, message) {
		client.publish(channel, message);
	});
	
	client.on('disconnect', function() {
		client.cleanup.call(this);
	});
	
	client.on('error', function() {
		client.cleanup.call(this);
	});
	
	client.cleanup = function() {
		client.stream.end();
		client.redis.end();
		client = null;
	}
});

server.conns = [];

server.listen(1883);

*/

