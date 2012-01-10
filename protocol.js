/* Generic */

var protocol = module.exports;

module.exports.types = {
	0: 'reserved',
	1: 'connect',
	2: 'connack',
	3: 'publish',
	4: 'puback',
	5: 'pubrec',
	6: 'pubrel', 
	7: 'pubcomp',
	8: 'subscribe',
	9: 'suback',
	10: 'unsubscribe',
	11: 'unsuback',
	12: 'pingreq',
	13: 'pingresp',
	14: 'disconnect',
	15: 'reserved'
};

module.exports.codes = {}
for(var k in module.exports.types) {
	var v = module.exports.types[k];
	module.exports.codes[v] = k;
}

/* Header */
module.exports.CMD_SHIFT = 4;
module.exports.CMD_MASK = 0xF0;
module.exports.DUP_MASK = 0x08;
module.exports.QOS_MASK = 0x05;
module.exports.QOS_SHIFT = 1;
module.exports.RETAIN_MASK = 0x01;

/* Length */
module.exports.LENGTH_MASK = 0x7F;
module.exports.LENGTH_FIN_MASK = 0x80;

/* Connect */
module.exports.USERNAME_MASK = 0x80;
module.exports.PASSWORD_MASK = 0x40;
module.exports.WILL_RETAIN_MASK = 0x20;
module.exports.WILL_QOS_MASK = 0x18;
module.exports.WILL_QOS_SHIFT = 3;
module.exports.WILL_FLAG_MASK = 0x04;
module.exports.CLEAN_SESSION_MASK = 0x02;

module.exports.parse_header = function(buf) {
	var packet = {};

	packet.cmd = protocol.types[buf[0] >> protocol.CMD_SHIFT];
	packet.retain = (buf[0] & protocol.RETAIN_MASK) !== 0;
	packet.qos = (buf[0] & protocol.QOS_MASK) >> protocol.QOS_SHIFT;
	packet.dup = (buf[0] & protocol.DUP_MASK) !== 0;

	return packet;
};
	
module.exports.parse_connect = function(buf) {
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
	packet.versionNumber = buf[pos];
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
		
		/* Parse will message */
		packet.will.message = parse_string(buf, len, pos);
		if(packet.will.message === null) return null;
		pos += packet.will.message.length + 2;
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

module.exports.parse_connack = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {};
		
	packet.code = parse_num(buf, len, pos);
	if(packet.code === null) return null;
	
	return packet;
};

module.exports.parse_publish = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {};
	
	/* Parse topic name */
	packet.topic = parse_string(buf, len, pos);
	if(packet.topic === null) return null;
	pos += packet.topic.length;
	
	/* Parse message ID */
	packet.messageID = parse_num(buf, len, pos);
	if(packet.messageID === null) return null;
	pos += 2;
	
	/* Parse the payload */
	/* No checks - whatever remains in the packet is the payload */
	packet.payload = buf.toString('utf8', pos, len);
	
	return packet; 
}

module.exports.parse_puback = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {}; 
	
	packet.messageID = parse_num(buf, len, pos);
	if(packet.messageId === null) return null;
	
	return packet;
};

module.exports.parse_pubrec = module.exports.parse_puback;
module.exports.parse_pubrel = module.exports.parse_puback;
module.exports.parse_pubcomp = module.exports.parse_puback;

module.exports.parse_subscribe = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {subscriptions: []};

	/* Parse message ID */
	packet.messageID = parse_num(buf, len, pos);
	if(packet.messageID === null) return null;
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
		packet.subscriptions.push([topic, qos]);
	}
	
	return packet;
};

module.exports.parse_suback = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {granted: []};
		
		/* Parse message ID */
		packet.messageID = parse_num(buf, len, pos);
		if(packet.messageID === null) return null;
		pos += 2;
		
		while(pos < len) {
			packet.granted.push(buf[pos++]);
		}
		
		return packet;
};

module.exports.parse_unsubscribe = function(buf) {
	var len = buf.length,
		pos = 0,
		packet = {unsubscriptions: []};

	/* Parse message ID */
	packet.messageID = parse_num(buf, len, pos);
	if(packet.messageID === null) return null;
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

module.exports.parse_unsuback = module.exports.parse_puback;

module.exports.parse_pingreq = function(buf) {
	return {};
};

module.exports.parse_pingresp = module.exports.parse_pingreq;
module.exports.parse_disconnect = module.exports.parse_pingreq;

var parse_num = function(buf, len, pos) {
	if(2 > pos + len) return null;
	return buf.readUInt16BE(pos);
}

var parse_string = function(buf, len, pos) {
	var length = parse_num(buf, len, pos);
	if(length === null || length > pos + len) return null;
	return buf.toString('utf8', pos + 2, pos + length + 2);
}
