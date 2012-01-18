/* Parse - packet parsing */
var protocol = require('./protocol');

module.exports.header = function(buf) {
	var packet = {};

	packet.cmd = protocol.types[buf[0] >> protocol.CMD_SHIFT];
	packet.retain = (buf[0] & protocol.RETAIN_MASK) !== 0;
	packet.qos = (buf[0] & protocol.QOS_MASK) >> protocol.QOS_SHIFT;
	packet.dup = (buf[0] & protocol.DUP_MASK) !== 0;

	return packet;
};
	
module.exports.connect = function(buf) {
	var pos = 0,
		len = buf.length,
		packet = {},
		flags = {};
	
	/* Parse version string */
	debugger;

	packet.version = parse_string(buf, len, pos);
	if(packet.version === null) return null;
	pos += packet.version.length + 2;
	
	/* Parse version number */
	if(pos > len) return null;
	packet.versionNum = buf[pos];
	pos += 1;
	
	/* Parse connect flags */
	flags.username = (buf[pos] & protocol.USERNAME_MASK);
	flags.password = (buf[pos] & protocol.PASSWORD_MASK);
	flags.will = (buf[pos] & protocol.WILL_FLAG_MASK);
	
	if(flags.will) {
		packet.will = {}
		packet.will.retain = (buf[pos] & protocol.WILL_RETAIN_MASK) !== 0;
		packet.will.qos = (buf[pos] & protocol.WILL_QOS_MASK) >> protocol.WILL_QOS_SHIFT;
	}
	
	packet.clean = (buf[pos] & protocol.CLEAN_SESSION_MASK) !== 0;
	pos += 1;
	
	/* Parse keepalive */
	packet.keepalive = parse_num(buf, len, pos);
	if(packet.keepalive === null) return null;
	pos += 2;
	
	/* Parse client ID */
	packet.client = parse_string(buf, len, pos);
	if(packet.client === null) return null;
	pos += packet.client.length + 2;
	
	if(flags.will) {
		/* Parse will topic */
		packet.will.topic = parse_string(buf, len, pos);
		if(packet.will.topic === null) return null;
		pos += packet.will.topic.length + 2;
		
		/* Parse will payload */
		packet.will.payload = parse_string(buf, len, pos);
		if(packet.will.payload === null) return null;
		pos += packet.will.payload.length + 2;
	}
	
	/* Parse username */
	if(flags.username) {
		packet.username = parse_string(buf, len, pos);
		if(packet.username === null) return null;
		pos += packet.username.length + 2;
	}
	
	/* Parse password */
	if(flags.password) {
		packet.password = parse_string(buf, len, pos);
		if(packet.password === null) return null;
		pos += packet.password.length + 2;
	}
	
	return packet;
};

module.exports.connack = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {};
		
	packet.returnCode = parse_num(buf, len, pos);
	if(packet.returnCode === null) return null;
	
	return packet;
};

module.exports.publish = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {};
	
	/* Parse topic name */
	packet.topic = parse_string(buf, len, pos);
	if(packet.topic === null) return null;
	pos += packet.topic.length;
	
	/* Parse message ID */
	packet.messageId = parse_num(buf, len, pos);
	if(packet.messageId === null) return null;
	pos += 2;
	
	/* Parse the payload */
	/* No checks - whatever remains in the packet is the payload */
	packet.payload = buf.toString('utf8', pos, len);
	
	return packet; 
}

var pubs = ['puback', 'pubrec', 'pubrel', 'pubcomp', 'unsuback'];

for (var i = 0; i < pubs.length; i++) {
	module.exports[pubs[i]] = function(buf) {
		var len = buf.length,
			pos = 0,
			packet = {};

		packet.messageId = parse_num(buf, len, pos);
		if (packet.messageId === null) return null;

		return packet;
	};
}

module.exports.subscribe = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {subscriptions: []};

	/* Parse message ID */
	packet.messageId = parse_num(buf, len, pos);
	if(packet.messageId === null) return null;
	pos += 2;
	
	while(pos < len) {
		var topic, qos;
		
		/* Parse topic */
		topic = parse_string(buf, len, pos);
		if(topic === null) return null;
		pos += topic.length + 2;
		
		/* Parse QoS */
		qos = buf[pos++];
		
		/* Push pair to subscriptions */
		packet.subscriptions.push({topic: topic, qos: qos});
	}
	
	return packet;
};

module.exports.suback = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {granted: []};
		
		/* Parse message ID */
		packet.messageId = parse_num(buf, len, pos);
		if(packet.messageId === null) return null;
		pos += 2;
		
		while(pos < len) {
			packet.granted.push(buf[pos++]);
		}
		
		return packet;
};

module.exports.unsubscribe = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {unsubscriptions: []};

	/* Parse message ID */
	packet.messageId = parse_num(buf, len, pos);
	if(packet.messageId === null) return null;
	pos += 2;
	
	while(pos < len) {
		var topic;
		
		/* Parse topic */
		topic = parse_string(buf, len, pos);
		if(topic === null) return null;
		pos += topic.length + 2;
		
		/* Push topic to unsubscriptions */
		packet.unsubscriptions.push(topic);
	}
	
	return packet;	
};

var empties = ['pingreq', 'pingresp', 'disconnect'];

for (var i = 0; i < empties.length; i++) {
	module.exports[empties[i]] = function(buf) {
		return {};
	};
}

var parse_num = function(buf, len, pos) {
	if(2 > pos + len) return null;
	return buf.readUInt16BE(pos);
}

var parse_string = function(buf, len, pos) {
	var length = parse_num(buf, len, pos);
	if(length === null || length > pos + len) return null;
	return buf.toString('utf8', pos + 2, pos + length + 2);
}
