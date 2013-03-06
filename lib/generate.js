var protocol = require('./protocol');

/* TODO: consider rewriting these functions using buffers instead
 * of arrays
 */

/* Connect */
module.exports.connect = function(opts) {
  var opts = opts || {}
    , protocolId = opts.protocolId
    , protocolVersion = opts.protocolVersion
    , will = opts.will
    , clean = opts.clean
    , keepalive = opts.keepalive
    , clientId = opts.clientId
    , username = opts.username
    , password = opts.password;

  var length = 0;

  // Must be a string and non-falsy
  if(!protocolId || typeof protocolId !== "string") { 
    return new Error('Invalid protocol id');
  } else {
    length += protocolId.length + 2;
  }

  // Must be a 1 byte number
  if (!protocolVersion || 
      'number' !== typeof protocolVersion ||
      protocolVersion > 255 ||
      protocolVersion < 0) {

    return new Error('Invalid protocol version');
  } else {
    length += 1;
  }
  
  // Must be a non-falsy string
  if(!clientId ||
      'string' !== typeof clientId) {
    return new Error('Invalid client id');
  } else {
    length += clientId.length + 2;
  }
  
  // Must be a two byte number
  if ('number' !== typeof keepalive ||
      keepalive < 0 ||
      keepalive > 65535) {
    return new Error('Invalid keepalive');
  } else {
    length += 2;
  }

  // Connect flags
  length += 1;

  // If will exists...
  if (will) {
    // It must be an object
    if ('object' !== typeof will) {
      return new Error('Invalid will');
    } 
    // It must have topic typeof string
    if (!will.topic || 'string' !== typeof will.topic) {
      return new Error('Invalid will - invalid topic');
    } else {
      length += will.topic.length + 2;
    }
    // TODO: should be a buffer
    // It must have payload typeof string
    if (!will.payload || 'string' !== typeof will.payload) {
      return new Error('Invalid will - invalid payload');
    } else {
      length += will.payload.length + 2;
    }
    // It must have a number qos
    if ('number' !== typeof will.qos) {
      return new Error('Invalid will - invalid qos');
    }
  }

  // Username
  if (username && 'string' !== typeof username) {
    return new Error('Invalid username');
  } else if (username) {
    length += username.length + 2;
  } 

  // Password
  if (password && 'string' !== typeof password) {
    return new Error('Invalid password');
  } else if (password) {
    length += password.length + 2;
  }

  var buffer = new Buffer(1 + calc_length_length(length) + length)
    , pos = 0;

  // Generate header
  buffer[pos++] = protocol.codes['connect'] << protocol.CMD_SHIFT;

  // Generate length
  pos += write_length(buffer, pos, length);
  
  // Generate protocol ID
  pos += write_string(buffer, pos, protocolId);
  buffer[pos++] = protocolVersion;
  
  // Connect flags
  var flags = 0;
  flags |= username ? protocol.USERNAME_MASK : 0;
  flags |= password ? protocol.PASSWORD_MASK : 0;
  flags |= (will && will.retain) ? protocol.WILL_RETAIN_MASK : 0;
  flags |= (will && will.qos) ? 
    will.qos << protocol.WILL_QOS_SHIFT : 0;
  flags |= will ? protocol.WILL_FLAG_MASK : 0;
  flags |= clean ? protocol.CLEAN_SESSION_MASK : 0;

  buffer[pos++] = flags;
  
  // Keepalive
  pos += write_number(buffer, pos, keepalive);
  
  // Client ID
  pos += write_string(buffer, pos, clientId);
  
  // Will
  if (will) {
    pos += write_string(buffer, pos, will.topic);
    pos += write_string(buffer, pos, will.payload);
  }
  
  // Username and password
  if (username) pos += write_string(buffer, pos, username);
  if (password) pos += write_string(buffer, pos, password);

  return buffer;
};

/* Connack */
module.exports.connack = function(opts) {
  var opts = opts || {}
    , rc = opts.returnCode 
    , packet = {header: 0, payload: []};

  /* Check required fields */
  if ('number' !== typeof rc) {
    return new Error('Invalid return code');
  }

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
    , qos = opts.qos
    , retain = opts.retain ? protocol.RETAIN_MASK : 0
    , topic = opts.topic
    , payload = opts.payload || new Buffer(0)
    , id = opts.messageId
    , packet = {header: 0, payload: []};

  // Topic must be a non-empty string
  if (!topic || 'string' !== typeof topic) {
    return new Error('Invalid topic');
  }
  // Convert to buffer
  if (!Buffer.isBuffer(payload)) {
    payload = new Buffer(payload);
  }
  // Message id must a number if qos > 0
  if (qos && 'number' !== typeof id) {
    return new Error('Invalid message id')
  }

  /* Generate header */
  packet.header = protocol.codes['publish'] << protocol.CMD_SHIFT |
    dup | qos << protocol.QOS_SHIFT | retain;

  /* Topic name */ 
  packet.payload = packet.payload.concat(gen_string(topic));

  /* Message ID */
  if (qos > 0) {
    packet.payload = packet.payload.concat(gen_number(id));
  }

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

  if ('number' !== typeof id) {
    return new Error('Invalid message id');
  }

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
    , id = opts.messageId
    , subs = opts.subscriptions
    , packet = {header: 0, payload: []};

  // Check mid
  if ('number' !== typeof id) {
    return new Error('Invalid message id');
  }
  // Check subscriptions
  if ('object' === typeof subs && subs.length) {
    for (var i = 0; i < subs.length; i += 1) {
      var topic = subs[i].topic
        , qos = subs[i].qos;

      if ('string' !== typeof topic) {
        return new Error('Invalid subscriptions - invalid topic');
      }
      if ('number' !== typeof qos) {
        return new Error('Invalid subscriptions - invalid qos');
      }
    }
  } else {
    return new Error('Invalid subscriptions');
  }

  /* Generate header */
  /* All subscribe packets have a required QoS of 1 */
  packet.header = 
    protocol.codes['subscribe'] << protocol.CMD_SHIFT | 
    dup | 
    1 << protocol.QOS_SHIFT;

  /* Message ID */
  packet.payload = packet.payload.concat(gen_number(id));

  for (var i = 0; i < subs.length; i++) {
    var sub = subs[i]
      , topic = sub.topic
      , qos = sub.qos;

    /* Topic string */
    packet.payload = packet.payload.concat(gen_string(topic));
    packet.payload.push(qos);
  } 

  return new Buffer([packet.header]
            .concat(gen_length(packet.payload.length))
            .concat(packet.payload));
};

/* Suback */
module.exports.suback = function(opts) {
  var opts = opts || {}
    , id = opts.messageId
    , granted = opts.granted
    , packet = {header: 0, payload: []};

  // Check message id
  if ('number' !== typeof id) {
    return new Error('Invalid message id');
  }
  // Check granted qos vector
  if ('object' === typeof granted && granted.length) {
    for (var i = 0; i < granted.length; i += 1) {
      if ('number' !== typeof granted[i]) {
        return new Error('Invalid qos vector');
      }
    }
  } else {
    return new Error('Invalid qos vector');
  }

  packet.header = protocol.codes['suback'] << protocol.CMD_SHIFT;

  /* Message ID */
  packet.payload = packet.payload.concat(gen_number(id));

  /* Subscriptions */
  for (var i = 0; i < granted.length; i++) {
    packet.payload.push(granted[i]);
  }

  return new Buffer([packet.header]
            .concat(gen_length(packet.payload.length))
            .concat(packet.payload));

};

/* Unsubscribe */
module.exports.unsubscribe = function(opts) {
  var opts = opts || {}
    , id = opts.messageId
    , dup = opts.dup ? protocol.DUP_MASK : 0
    , unsubs = opts.unsubscriptions
    , packet = {header: 0, payload: []};

  // Check message id
  if ('number' !== typeof id) {
    return new Error('Invalid message id');
  }
  // Check unsubs
  if ('object' === typeof unsubs && unsubs.length) {
    for (var i = 0; i < unsubs.length; i += 1) {
      if ('string' !== typeof unsubs[i]) {
        return new Error('Invalid unsubscriptions');
      }
    }
  } else {
    return new Error('Invalid unsubscriptions');
  }

  // Generate header
  packet.header = 
    protocol.codes['unsubscribe'] << protocol.CMD_SHIFT |
    dup | 
    1 << protocol.QOS_SHIFT;

  /* Message ID */
  packet.payload = packet.payload.concat(gen_number(id));

  for (var i = 0; i < unsubs.length; i++) {
    packet.payload = packet.payload.concat(gen_string(unsubs[i]));
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

/**
 * calc_length_length - calculate the length of the remaining
 * length field
 *
 * @api private
 */

function calc_length_length(length) {
  if (length >= 0 && length < 128) {
    return 1;
  } else if (length >= 128 && length < 16384) {
    return 2;
  } else if (length >= 16384 && length < 2097152) {
    return 3;
  } else if (length >= 2097152 && length < 268435456) {
    return 4;
  } else {
    return 0;
  }
};

/**
 * write_length - write an MQTT style length field to the buffer
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <Number> length - length (>0)
 * @returns <Number> number of bytes written
 *
 * @api private
 */

function write_length(buffer, pos, length) {
  var digit = 0
    , origPos = pos;
  
  do {
    digit = length % 128 | 0
    length = length / 128 | 0;
    if (length > 0) {
        digit = digit | 0x80;
    }
    buffer[pos++] = digit;
  } while (length > 0);
  
  return pos - origPos;
};

/**
 * write_string - write a utf8 string to the buffer
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <String> string - string to write
 * @return <Number> number of bytes written
 *
 * @api private
 */

function write_string(buffer, pos, string) {
  var strlen = string.length;

  write_number(buffer, pos, strlen);
  buffer.write(string, pos+2);

  return strlen + 2;
};

/**
 * write_number - write a two byte number to the buffer
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <String> number - number to write
 * @return <Number> number of bytes written
 *
 * @api private
 */
function write_number(buffer, pos, number) {
  buffer[pos] = number >> 8;
  buffer[pos+1] = number & 0x00FF;
  
  return 2;
};
