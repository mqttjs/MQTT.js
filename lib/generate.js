var protocol = require('./protocol')
  , crypto = require('crypto');

/* TODO: consider rewriting these functions using buffers instead
 * of arrays
 */

/* Defaults */
var defaultVersion = 'MQIsdp'
  , defaultVersionNum = 3
  , defaultKeepalive = 60;

function defaultClient() {
  return 'mqttjs_' + crypto.randomBytes(16).toString('hex');
}

/* Connect */
module.exports.connect = function(opts) {
  var opts = opts || {}
    , version = opts.version || defaultVersion
    , versionNum = opts.versionNum || defaultVersionNum
    , will = opts.will
    , clean = opts.clean
    , keepalive = opts.keepalive || defaultKeepalive
    , client = opts.client || defaultClient()
    , username = opts.username
    , password = opts.password
    , packet = {header: 0, length: 0, payload: []};
    
  /* Check required fields */
  
  /* Version must be a string but it can be empty */
  if(typeof version !== "string") return null;
  /* Version number must be a one byte number */
  if(typeof versionNum !== "number" || versionNum < 0 || versionNum > 255) return null;
  /* Client ID must be a string */
  if(typeof client !== "string") return null;
  /* Keepalive must be a number between 0x0000 and 0xFFFF */
  if(typeof keepalive !== "number" || keepalive < 0x0000 || keepalive > 0xFFFF) return null;
  /* If will is present it must contain string topic and payload */
  if (typeof will !== "undefined" && (typeof will.topic !== "string" || typeof will.payload !== "string")) return null;

  /* Generate header */
  packet.header = protocol.codes['connect'] << protocol.CMD_SHIFT;
  
  /* Generate payload */
  
  /* Version */
  packet.payload = packet.payload.concat(gen_string(version));
  packet.payload.push(versionNum);
  
  /* Connect flags */
  var flags = 0;
  flags |= (typeof username !== 'undefined') ? protocol.USERNAME_MASK : 0;
  flags |= (typeof password !== 'undefined') ? protocol.PASSWORD_MASK : 0;
  flags |= (will && will.retain) ? protocol.WILL_RETAIN_MASK : 0;
  flags |= (will && will.qos) ? will.qos << protocol.WILL_QOS_SHIFT : 0;
  flags |= will ? protocol.WILL_FLAG_MASK : 0;
  flags |= clean ? protocol.CLEAN_SESSION_MASK : 0;
  
  packet.payload.push(flags);
  
  /* Keepalive */
  packet.payload = packet.payload.concat(gen_number(keepalive));
  
  /* Client ID */
  packet.payload = packet.payload.concat(gen_string(client));
  
  /* Wills */
  if (will) {
      packet.payload = packet.payload
      .concat(gen_string(will.topic))
      .concat(gen_string(will.payload));
  }
  
  /* Username and password */
  if(flags & protocol.USERNAME_MASK) packet.payload = packet.payload.concat(gen_string(username));
  if(flags & protocol.PASSWORD_MASK) packet.payload = packet.payload.concat(gen_string(password));
  
  return new Buffer([packet.header].concat(gen_length(packet.payload.length)).concat(packet.payload));
};

/* Connack */
module.exports.connack = function(opts) {
  var opts = opts || {}
    , rc = opts.returnCode || 0
    , packet = {header: 0, payload: []};

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
module.exports.publish = function(opts) {
  var opts = opts || {}
    , dup = opts.dup ? protocol.DUP_MASK : 0
    , qos = opts.qos || 0
    , retain = opts.retain ? protocol.RETAIN_MASK : 0
    , topic = opts.topic
    , payload = opts.payload || new Buffer(0)
    , id = (typeof opts.messageId === 'undefined') ? randint() : opts.messageId
    , packet = {header: 0, payload: []};

  /* Check required fields */
  if (typeof topic !== 'string' || topic.length <= 0) return null;
  /* if payload is a string, we'll convert it into a buffer */
  if(typeof payload == 'string') {
	  payload = new Buffer(payload);
  }
  /* accepting only a buffer for payload */
  if (!Buffer.isBuffer(payload)) return null;
  if (typeof qos !== 'number' || qos < 0 || qos > 2) return null;
  if (typeof id !== 'number' || id < 0 || id > 0xFFFF) return null;

  /* Generate header */
  packet.header = protocol.codes['publish'] << protocol.CMD_SHIFT |
    dup | qos << protocol.QOS_SHIFT | retain;

  /* Topic name */ 
  packet.payload = packet.payload.concat(gen_string(topic));

  /* Message ID */
  if (qos > 0) packet.payload = packet.payload.concat(gen_number(id));


  var buf = new Buffer([packet.header]
		  .concat(gen_length(packet.payload.length + payload.length))
		  .concat(packet.payload));

  return Buffer.concat([buf, payload]);
};

/* Puback, pubrec, pubrel and pubcomp */
var gen_pubs = function(opts, type) {
  var opts = opts || {}
    , id = opts.messageId
    , dup = (opts.dup && type === 'pubrel') ? protocol.DUP_MASK : 0
    , qos = type === 'pubrel' ? 1 : 0
    , packet = {header: 0, payload: []};

  /* Check required field */
  if (typeof id !== 'number' || (id < 0) || (id > 0xFFFF)) return null;

  /* Header */
  packet.header = protocol.codes[type] << protocol.CMD_SHIFT | 
    dup | qos << protocol.QOS_SHIFT;

  /* Message ID */
  packet.payload = packet.payload.concat(gen_number(id));

  return new Buffer([packet.header]
            .concat(gen_length(packet.payload.length))
            .concat(packet.payload));
}

var pubs = ['puback', 'pubrec', 'pubrel', 'pubcomp'];

for (var i = 0; i < pubs.length; i++) {
  module.exports[pubs[i]] = function(pubType) {
    return function(opts) {
      return gen_pubs(opts, pubType);
    }
  }(pubs[i]);
}

/* Subscribe */
module.exports.subscribe = function(opts) {
  var opts = opts || {}
    , dup = opts.dup ? protocol.DUP_MASK : 0
    , qos = opts.qos || 0
    , id = (typeof opts.messageId === 'undefined') ? randint() : opts.messageId
    , subs = opts.subscriptions
    , topic = opts.topic
    , packet = {header: 0, payload: []};

  /* Check required fields */
  if (typeof id !== 'number' || (id < 0) || (id > 0xFFFF)) return null;
  if (typeof topic !== 'string' || topic.length === 0 || 
    typeof qos !== 'number' || (qos < 0) || (qos > 2)) { 
    /* Well obviously - typeof never returns 'array' */
    if (typeof subs !== 'object' || subs.length === 0) { 
      return null;
    }
  }

  /* Generate header */
  /* All subscribe packets have a required QoS of 1 */
  packet.header = protocol.codes['subscribe'] << protocol.CMD_SHIFT | 
    dup | 1 << protocol.QOS_SHIFT;

  /* Message ID */
  packet.payload = packet.payload.concat(gen_number(id));

  /* Subscriptions */
  if (topic) {
    packet.payload = packet.payload.concat(gen_string(topic));
    packet.payload.push(qos);
  } else if (subs) {
    for (var i = 0; i < subs.length; i++) {
      var sub = subs[i]
        , topic = sub.topic || sub
        , qos = sub.qos || 0;

      if (typeof topic !== 'string' || topic.length === 0) return null;
      if (typeof qos !== 'number' || (qos < 0) || (qos > 2)) return null;

      /* Topic string */
      packet.payload = packet.payload.concat(gen_string(topic));

      /* Requested qos */
      /* Coerce to int */
      packet.payload.push(qos | 0);
    }
  } else {
    return null;
  }

  return new Buffer([packet.header]
            .concat(gen_length(packet.payload.length))
            .concat(packet.payload));
};

/* Suback */
module.exports.suback = function(opts) {
  var opts = opts || {}
    , id = (typeof opts.messageId === 'undefined') ? randint() : opts.messageId
    , granted = opts.granted || [0]
    , packet = {header: 0, payload: []};

  /* Check required fields */
  if (typeof id !== 'number' || (id < 0) || (id > 0xFFFF)) return null;
  if (typeof granted !== 'object' || granted.length === 0) return null;

  packet.header = protocol.codes['suback'] << protocol.CMD_SHIFT;

  /* Message ID */
  packet.payload = packet.payload.concat(gen_number(id));

  /* Subscriptions */
  for (var i = 0; i < granted.length; i++) {
    var qos = granted[i];
    /* Check validity */
    if (typeof qos !== 'number' || (qos < 0) || (qos > 2)) return null;

    /* Granted qos */
    /* Coerce to int */
    packet.payload.push(qos | 0);
  }

  return new Buffer([packet.header]
            .concat(gen_length(packet.payload.length))
            .concat(packet.payload));

};

/* Unsubscribe */
module.exports.unsubscribe = function(opts) {
  var opts = opts || {}
    , id = (typeof opts.messageId === 'undefined') ? randint() : opts.messageId
    , topic = opts.topic
    , dup = opts.dup ? protocol.DUP_MASK : 0
    , unsubs = opts.unsubscriptions
    , packet = {header: 0, payload: []};

  /* Check required fields */
  if (typeof id !== 'number' || (id < 0) || (id > 0xFFFF)) return null;
  if (typeof topic !== 'string' || topic.length === 0) {
  if (typeof unsubs !== 'object' || unsubs.length === 0) { return null;
  }}

  /* Generate header */
  packet.header = protocol.codes['unsubscribe'] << protocol.CMD_SHIFT |
    dup | 1 << protocol.QOS_SHIFT;

  /* Message ID */
  packet.payload = packet.payload.concat(gen_number(id));

  /* Unsubscriptions */
  if (topic) {
    packet.payload = packet.payload.concat(gen_string(topic));
  } else if(unsubs) {
    for (var i = 0; i < unsubs.length; i++) {
      var unsub = unsubs[i];

      /* Check validity */
      if (typeof unsub !== 'string' || unsub.length === 0) return null;

      /* Unsubscription */
      packet.payload = packet.payload.concat(gen_string(unsub));
    }
  } else {
    return null;
  }

  return new Buffer([packet.header]
            .concat(gen_length(packet.payload.length))
            .concat(packet.payload));
};
  
/* Unsuback */
/* Note: uses gen_pubs since unsuback is the same as suback */
module.exports.unsuback = function(type) {
  return function(opts) {
    return gen_pubs(opts, type);
  }
}('unsuback');

/* Pingreq, pingresp, disconnect */
var empties = ['pingreq', 'pingresp', 'disconnect'];

for (var i = 0; i < empties.length; i++) {
  module.exports[empties[i]] = function(type) {
    return function(opts) {
      return new Buffer([protocol.codes[type] << 4, 0]);
    }
  }(empties[i]);
}

/* Requires length be a number > 0 */
var gen_length = function(length) {
  if(typeof length !== "number") return null;
  if(length < 0) return null;
  
  var len = []
    , digit = 0;
  
  do {
    digit = length % 128 | 0
    length = length / 128 | 0;
    if (length > 0) {
        digit = digit | 0x80;
    }
    len.push(digit);
  } while (length > 0);
  
  return len;
};

var gen_string = function(str, without_length) { /* based on code in (from http://farhadi.ir/downloads/utf8.js) */
  if(arguments.length < 2) without_length = false;
  if(typeof str !== "string") return null;
  if(typeof without_length !== "boolean") return null;

  var string = []
  var length = 0;
  for(var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    if (code < 128) {
      string.push(code);                      ++length;
    
    } else if (code < 2048) {
      string.push(192 + ((code >> 6 )   )); ++length;
      string.push(128 + ((code    ) & 63)); ++length;
    } else if (code < 65536) {
      string.push(224 + ((code >> 12)   )); ++length;
      string.push(128 + ((code >> 6 ) & 63)); ++length;
      string.push(128 + ((code    ) & 63)); ++length;
    } else if (code < 2097152) {
      string.push(240 + ((code >> 18)   )); ++length;
      string.push(128 + ((code >> 12) & 63)); ++length;
      string.push(128 + ((code >> 6 ) & 63)); ++length;
      string.push(128 + ((code    ) & 63)); ++length;
    } else {
      throw new Error("Can't encode character with code " + code);
    }
  }
  return without_length ? string : gen_number(length).concat(string);
}

var gen_number = function(num) {
  var number = [num >> 8, num & 0x00FF];
  return number;
}

var randint = function() { return Math.floor(Math.random() * 0xFFFF) };
