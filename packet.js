var protocol = require('./protocol');

/* TODO: consider rewriting these functions using buffers instead
 * of arrays
 */

/* Connect */
module.exports.gen_connect = function(opts) {
	var opts = opts || {},
		version = opts.version,
		versionNum = opts.versionNum,
		willTopic = opts.willTopic,
		willMessage = opts.willMessage,
		willRetain = opts.willRetain,
		willQos = opts.willQos,
		clean = opts.clean,
		keepalive = opts.keepalive,
		client = opts.client,
		username = opts.username,
		password = opts.password,
		packet = {header: 0, length: 0, payload: []};
		
	/* Check required fields */
	
	/* Version must be a string but it can be empty */
	if(typeof version !== "string") return null;
	/* Version number must be a one byte number */
	if(typeof versionNum !== "number" || versionNum < 0 || versionNum > 255) return null;
	/* Client ID must be a string */
	if(typeof client !== "string") return null;
	/* Keepalive must be a number between 0x0000 and 0xFFFF */
	if(typeof keepalive !== "number" || keepalive < 0x0000 || keepalive > 0xFFFF) return null;
		
	packet.header = protocol.codes['connect'] << 4;
	
	/* Generate payload */
	
	/* Version */
	packet.payload = packet.payload.concat(gen_string(version));
	packet.payload.push(versionNum);
	
	/* Connect flags */
	var flags = 0;
	flags |= (typeof username !== 'undefined') ? protocol.USERNAME_MASK : 0;
	flags |= (typeof password !== 'undefined') ? protocol.PASSWORD_MASK : 0;
	flags |= willRetain ? protocol.WILL_RETAIN_MASK : 0;
	flags |= willQos ? willQos << protocol.WILL_QOS_SHIFT : 0;
	flags |= (typeof willTopic !== 'undefined' && typeof willMessage !== 'undefined') ? protocol.WILL_FLAG_MASK : 0;
	flags |= clean ? protocol.CLEAN_SESSION_MASK : 0;
	
	packet.payload.push(flags);
	
	/* Keepalive */
	packet.payload = packet.payload.concat(gen_number(keepalive));
	
	/* Client ID */
	packet.payload = packet.payload.concat(gen_string(client));
	
	/* Wills */
	if(flags & protocol.WILL_FLAG_MASK) packet.payload = packet.payload.concat(gen_string(willTopic));
	if(willMessage) packet.payload = packet.payload.concat(gen_string(willMessage));
	
	/* Username and password */
	if(username) packet.payload = packet.payload.concat(gen_string(username));
	if(password) packet.payload = packet.payload.concat(gen_string(password));
	
	return new Buffer([packet.header].concat(gen_length(packet.payload.length)).concat(packet.payload));
};

/* Connack */
module.exports.gen_connack = function(opts) {
	var opts = opts || {},
		rc = opts.returnCode,
		packet = {header: 0, payload: []};

	/* Check required fields */
	/* TODO: abstract limits for rc - might change with protocol versions */
	if (typeof rc !== 'number' || (rc < 0) || (rc > 5)) return null; 

	packet.header = protocol.codes['connack'] << protocol.CMD_SHIFT;
	packet.payload.push(0);
	packet.payload.push(rc);

	return new Buffer([packet.header]
					  .concat(gen_length(packet.payload.length))
					  .concat(packet.payload));
}

/* Publish */
module.exports.gen_publish = function(opts) {
	var opts = opts || {},
		dup = opts.dup,
		qos = opts.qos,
		retain = opts.retain,
		topic = opts.topic,
		payload = opts.payload,
		id = opts.messageId,
		packet = {header: 0, payload: []};

	/* Check required fields */
	if (typeof topic !== 'string' || topic.length <= 0) return null;
	if (typeof payload !== 'string') return null;
	if (!(typeof id === 'undefined' ||  
		(typeof id === 'number' && (id < 0)  && (id > 0xFFFF)))) return null;

	/* Generate header */
	packet.header = protocol.codes['publish'] << protocol.CMD_SHIFT |
		dup << protocol.DUP_SHIFT | qos << protocol.QOS_SHIFT | 
		retain << protocol.RETAIN_SHIFT;

	/* Topic name */ 
	packet.payload = packet.payload.concat(gen_string(topic));

	/* Message ID */
	if (id) packet.payload = packet.payload.concat(gen_number(id));

	/* Payload */
	for (var i = 0; i < payload.length; i++) {
		packet.payload.push(payload.charCodeAt(i));
	}

	return new Buffer([packet.header]
					  .concat(gen_length(packet.payload.length))
					  .concat(packet.payload));
	
};

/* Puback, pubrec, pubrel and pubcomp */
var gen_pubs = function(opts, type) {
	var opts = opts || {},
		id = opts.messageId,
		packet = {header: 0, payload: []};

	/* Check required field */
	if (typeof id !== 'number' || (id < 0) || (id > 0xFFFF)) return null;

	/* Header */
	packet.header = protocol.codes[type] << protocol.CMD_SHIFT;

	/* Message ID */
	packet.payload = packet.payload.concat(gen_number(id));

	return new Buffer([packet.header]
					  .concat(gen_length(packet.payload.length))
					  .concat(packet.payload));
}

var pubs = ['puback', 'pubrec', 'pubrel', 'pubcomp'];

for (var i = 0; i < pubs.length; i++) {
	module.exports['gen_' + pubs[i]] = function(pubType) {
		return function(opts) {
			return gen_pubs(opts, pubType);
		}
	}(pubs[i]);
}

/* Subscribe */
module.exports.gen_subscribe = function(opts) {
	var opts = opts || {},
		dup = opts.dup,
		qos = opts.qos,
		id = opts.messageId,
		subs = opts.subscriptions,
		packet = {header: 0, payload: []};

	/* Check required fields */
	if (typeof id !== 'number' || (id < 0) || (id > 0xFFFF)) return null;
	if (typeof subs !== 'array' || subs.length === 0) return null;

	/* TODO: also need to check that subs is an array of {topic: <string>, qos: <number>} */

	/* Generate header */
	packet.header = protocol.codes['subscribe'] << protocol.CMD_SHIFT | 
		dup << protocol.DUP_SHIFT | qos << protocol.QOS_SHIFT;

	/* Message ID */
	packet.payload = packet.payload.concat(gen_number(id));

	/* Subscriptions */
	for (var i = 0; i < subs.length; i++) {
		var topic = subs[i].topic,
			qos = subs[i].qos;
		/* Check validity */
		if (typeof topic !== 'string' || topic.length === 0) return null;
		if (typeof qos !== 'number' || (qos < 0) || (qos > 2)) return null;

		/* Topic string */
		packet.payload = packet.payload.concat(gen_string(topic));

		/* Requested qos */
		/* Coerce to int */
		packet.push(qos | 0);
	}

	return new Buffer([packet.header]
					  .concat(gen_length(packet.payload.length))
					  .concat(packet.payload));
};

/* Suback */
module.exports.gen_suback = function(opts) {
	var opts = opts || {},
		id = opts.messageId,
		granted = opts.granted,
		packet = {header: 0, payload: []};

	/* Check required fields */
	if (typeof id !== 'number' || (id < 0) || (id > 0xFFFF)) return null;
	if (typeof granted !== 'array' || granted.length === 0) return null;

	packet.header = protocol.codes['suback'] << protocol.CMD_SHIFT;

	/* Message ID */
	packet.payload = packet.payload.concat(gen_number(id));

	/* Subscriptions */
	for (var i = 0; i < granted.length; i++) {
		var qos = granted[i].qos;
		/* Check validity */
		if (typeof qos !== 'number' || (qos < 0) || (qos > 2)) return null;

		/* Granted qos */
		/* Coerce to int */
		packet.push(qos | 0);
	}

	return new Buffer([packet.header]
					  .concat(gen_length(packet.payload.length))
					  .concat(packet.payload));

};

/* Unsuback */
module.exports.gen_unsuback = function(type) {
	return function(opts) {
		return gen_subs(type, opts);
	}
}('unsuback');

/* Pingreq, pingresp, disconnect */
var empties = ['pingreq', 'pingresp', 'disconnect'];

for (var i = 0; i < empties.length; i++) {
	module.exports['gen_' + empties[i]] = function(type) {
		return function(opts) {
			return new Buffer([protocol.codes[type] << 4, 0]);
		}
	}(empties[i]);
}

/* Requires length be a number > 0 */
var gen_length = function(length) {
	if(typeof length !== "number") return null;
	if(length < 0) return null;
	
	var len = [],
		digit = 0;
	
		do {
	        digit = length % 128 | 0
	        length = length / 128 | 0;
	        if (length > 0) {
	            digit = digit | 0x80;
	        }
	        len.push(digit);
	    }
	    while (length > 0);
	
	return len;
};

var gen_string = function(str) {
	if(typeof str !== "string") return null;
	
	var string = gen_number(str.length);
	for(var i = 0; i < str.length; i++) {
		string.push(str.charCodeAt(i));
	}
	
	return string;
}

var gen_number = function(num) {
	var number = [num >> 8, num & 0x00FF];
	return number;
}

module.exports.priv = {gen_length: gen_length, gen_string: gen_string, gen_number: gen_number};
