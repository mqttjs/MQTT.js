var protocol = require('./protocol');

module.exports.gen_connect = function(opts) {
	var version = opts.version,
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
	if(willTopic) packet.payload = packet.payload.concat(gen_string(willTopic));
	if(willMessage) packet.payload = packet.payload.concat(gen_string(willMessage));
	
	/* Username and password */
	if(username) packet.payload = packet.payload.concat(gen_string(username));
	if(password) packet.payload = packet.payload.concat(gen_string(password));
	
	return new Buffer([packet.header].concat(gen_length(packet.payload.length)).concat(packet.payload));
};

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