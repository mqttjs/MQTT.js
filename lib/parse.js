/* Parse - packet parsing */
var protocol = require('./protocol');
var bops = require('bops');

module.exports.header = function(buf, packet) {
  var zero = bops.readUInt8(buf, 0);
  packet.cmd = protocol.types[zero >> protocol.CMD_SHIFT];
  packet.retain = (zero & protocol.RETAIN_MASK) !== 0;
  packet.qos = (zero >> protocol.QOS_SHIFT) & protocol.QOS_MASK;
  packet.dup = (zero & protocol.DUP_MASK) !== 0;
  return packet;
};
  
module.exports.connect = function(buf, packet) {
  var pos = 0
    , len = buf.length
    , protocolId // Protocol id
    , clientId // Client id
    , topic // Will topic
    , payload // Will payload
    , password // Password
    , username // Username
    , flags = {};
  
  // Parse protocol id
  protocolId = parse_string(buf, len, pos);
  if (protocolId === null) return new Error('Parse error - cannot parse protocol id');
  packet.protocolId = protocolId[0];
  pos += protocolId[1] + 2;

  // Parse protocol version number
  if(pos > len) return null;
  packet.protocolVersion = bops.readUInt8(buf, pos);
  pos += 1;
  
  // Parse connect flags
  flags.username = (bops.readUInt8(buf, pos) & protocol.USERNAME_MASK);
  flags.password = (bops.readUInt8(buf, pos) & protocol.PASSWORD_MASK);
  flags.will = (bops.readUInt8(buf, pos) & protocol.WILL_FLAG_MASK);
  
  if(flags.will) {
    packet.will = {};
    packet.will.retain = (bops.readUInt8(buf, pos) & protocol.WILL_RETAIN_MASK) !== 0;
    packet.will.qos = (bops.readUInt8(buf, pos) & protocol.WILL_QOS_MASK) >> protocol.WILL_QOS_SHIFT;
  }
  
  packet.clean = (bops.readUInt8(buf, pos) & protocol.CLEAN_SESSION_MASK) !== 0;
  pos += 1;
  
  // Parse keepalive
  packet.keepalive = parse_num(buf, len, pos);
  if(packet.keepalive === null) return null;
  pos += 2;
  
  // Parse client ID
  clientId = parse_string(buf, len, pos);
  if(clientId === null) return new Error('Parse error - cannot parse client id');
  packet.clientId = clientId[0];
  pos += clientId[1] + 2;

  if(flags.will) {
    // Parse will topic
    topic = parse_string(buf, len, pos);
    if(topic === null) return new Error('Parse error - cannot parse will topic');
    packet.will.topic = topic[0];
    pos += topic[1] + 2;

    // Parse will payload
    payload = parse_string(buf, len, pos);
    if(payload === null) return new Error('Parse error - cannot parse will payload');
    packet.will.payload = payload[0];
    pos += payload[1] + 2;
  }
  
  // Parse username
  if(flags.username) {
    username = parse_string(buf, len, pos);
    if(username === null) return new Error('Parse error - cannot parse username');
    packet.username = username[0];
    pos += username[1] + 2;
  }
  
  // Parse password
  if(flags.password) {
    password = parse_string(buf, len, pos);
    if(password === null) return ;
    packet.password = password[0];
    pos += password[1] + 2;
  }
  
  return packet;
};

module.exports.connack = function(buf, packet) {
  var len = buf.length
    , pos = 0;
    
  packet.returnCode = parse_num(buf, len, pos);
  if(packet.returnCode === null) return new Error('Parse error - cannot parse return code');
  
  return packet;
};

module.exports.publish = function(buf, packet, encoding) {
  var len = buf.length
    , pos = 0
    , topic;
  
  // Parse topic name
  topic = parse_string(buf, len, pos);
  if(topic === null) return new Error('Parse error - cannot parse topic');
  packet.topic = topic[0];
  pos += topic[1] + 2;

  // Parse message ID
  if (packet.qos > 0) {
    packet.messageId = parse_num(buf, len, pos);
    if(packet.messageId === null) return new Error('Parse error - cannot parse message id');
    pos += 2;
  }
  
  if (Buffer.isBuffer(buf)) {

    // Parse the payload
    /* No checks - whatever remains in the packet is the payload */
    if (encoding !== 'binary') {
      packet.payload = buf.toString(encoding, pos, len);
    } else {
      packet.payload = buf.slice(pos, len);
    }
  } else {
    buf = bops.subarray(buf, pos, len);

    if (encoding !== 'binary') {
      buf = bops.to(buf, encoding);
    }

    packet.payload = buf;
  }
  
  return packet; 
}

// Parse puback, pubrec, pubrel, pubcomp and suback
module.exports.puback =
module.exports.pubrec =
module.exports.pubrel =
module.exports.pubcomp =
module.exports.unsuback = function (buf, packet) {
  var len = buf.length
    , pos = 0;

  packet.messageId = parse_num(buf, len, pos);
  if (packet.messageId === null) return new Error('Parse error - cannot parse message id');

  return packet;
};

module.exports.subscribe = function(buf, packet) {
  var len = buf.length
    , pos = 0;

  packet.subscriptions = [];

  // Parse message ID
  packet.messageId = parse_num(buf, len, pos);
  if (packet.messageId === null) return new Error('Parse error - cannot parse message id');
  pos += 2;
  
  while(pos < len) {
    var topic
      , qos;
    
    // Parse topic
    topic = parse_string(buf, len, pos);
    if(topic === null) return new Error('Parse error - cannot parse topic');
    pos += topic[1] + 2;

    // Parse QoS
    // TODO: possible failure location
    qos = buf[pos++];
    
    // Push pair to subscriptions
    packet.subscriptions.push({topic: topic[0], qos: qos});
  }
  return packet;
};

module.exports.suback = function(buf, packet) {
  var len = buf.length
    , pos = 0;

    packet.granted = [];
    
    // Parse message ID
    packet.messageId = parse_num(buf, len, pos);
    if(packet.messageId === null) return new Error('Parse error - cannot parse message id');
    pos += 2;
    
    // Parse granted QoSes
    while(pos < len) {
      packet.granted.push(buf[pos++]);
    }
    return packet;
};

module.exports.unsubscribe = function(buf, packet) {
  var len = buf.length
    , pos = 0;

  packet.unsubscriptions = [];

  // Parse message ID
  packet.messageId = parse_num(buf, len, pos);
  if(packet.messageId === null) return new Error('Parse error - cannot parse message id');
  pos += 2;
  
  while(pos < len) {
    var topic;
    
    // Parse topic
    topic = parse_string(buf, len, pos);
    if(topic === null) return new Error('Parse error - cannot parse topic');
    pos += topic[1] + 2;

    // Push topic to unsubscriptions
    packet.unsubscriptions.push(topic[0]);
  }
  return packet;  
};

module.exports.reserved = function(buf, packet) {
  return new Error("reserved is not a valid command");
};

var empties = ['pingreq', 'pingresp', 'disconnect'];

module.exports.pingreq =
module.exports.pingresp =
module.exports.disconnect = function (buf, packet) {
  return packet;
};

var parse_num = function(buf, len, pos) {
  if(2 > pos + len) return null;
  return bops.readUInt16BE(buf, pos);
}

var parse_string = function(buf, len, pos) {
  var length = parse_num(buf, len, pos);
  if(length === null || length > pos + len) return null;

  if (Buffer.isBuffer(buf)) {
    return [buf.toString('utf8', pos + 2, pos + length + 2), length];
  } else {
    return [bops.to(bops.subarray(buf, pos + 2, pos + length + 2), 'utf8'), length];
  }
}
