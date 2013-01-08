/* Parse - packet parsing */
var protocol = require('./protocol');

module.exports.header = function(buf, packet) {
  packet.cmd = protocol.types[buf[0] >> protocol.CMD_SHIFT];
  packet.retain = (buf[0] & protocol.RETAIN_MASK) !== 0;
  packet.qos = (buf[0] >> protocol.QOS_SHIFT) & protocol.QOS_MASK;
  packet.dup = (buf[0] & protocol.DUP_MASK) !== 0;
  return packet;
};
  
module.exports.connect = function(buf, packet) {
  var pos = 0
    , len = buf.length
    , version_and_len
    , topic_and_len
    , username_and_len
    , client_and_len
    , payload_and_len
    , password_and_len
    , flags = {};
  
  /* Parse version string */
  version_and_len = parse_string(buf, len, pos);
  packet.version = version_and_len[0];
  if(packet.version === null) return null;
  pos += version_and_len[1] + 2;

  /* Parse version number */
  if(pos > len) return null;
  packet.versionNum = buf[pos];
  pos += 1;
  
  /* Parse connect flags */
  flags.username = (buf[pos] & protocol.USERNAME_MASK);
  flags.password = (buf[pos] & protocol.PASSWORD_MASK);
  flags.will = (buf[pos] & protocol.WILL_FLAG_MASK);
  
  if(flags.will) {
    packet.will = {};
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
  client_and_len = parse_string(buf, len, pos);
  packet.client = client_and_len[0];
  if(packet.client === null) return null;
  pos += client_and_len[1] + 2;

  if(flags.will) {
    /* Parse will topic */
    topic_and_len = parse_string(buf, len, pos);
    packet.will.topic = topic_and_len[0];
    if(packet.will.topic === null) return null;
    pos += topic_and_len[1] + 2;

    /* Parse will payload */
    payload_and_len = parse_string(buf, len, pos);
    packet.will.payload = payload_and_len[0];
    if(packet.will.payload === null) return null;
    pos += payload_and_len[1] + 2;
  }
  
  /* Parse username */
  if(flags.username) {
    username_and_len = parse_string(buf, len, pos);
    packet.username = username_and_len[0];
    if(packet.username === null) return null;
    pos += username_and_len[1] + 2;
  }
  
  /* Parse password */
  if(flags.password) {
    password_and_len = parse_string(buf, len, pos);
    packet.password = password_and_len[0];
    if(packet.password === null) return null;
    pos += password_and_len[1] + 2;
  }
  
  pos = len = version_and_len = topic_and_len = username_and_len = client_and_len = payload_and_len = password_and_len = flags = buf = null;
  
  return packet;
};

module.exports.connack = function(buf, packet) {
  var len = buf.length
    , pos = 0;
    
  packet.returnCode = parse_num(buf, len, pos);
  if(packet.returnCode === null) return null;
  
  buf = len = pos = null;
  
  return packet;
};

module.exports.publish = function(buf, packet) {
  var len = buf.length
    , pos = 0
    , topic_and_len;
  
  /* Parse topic name */
  topic_and_len = parse_string(buf, len, pos);
  packet.topic = topic_and_len[0];
  if(packet.topic === null) return null;
  pos += topic_and_len[1] + 2;

  /* Parse message ID */
  if (packet.qos > 0) {
    packet.messageId = parse_num(buf, len, pos);
    if(packet.messageId === null) return null;
    pos += 2;
  }
  
  /* Parse the payload */
  /* No checks - whatever remains in the packet is the payload */
  packet.payload = buf.toString('utf8', pos, len);
  
  buf = len = pos = topic_and_len = null;
  
  return packet; 
}

var pubs = ['puback', 'pubrec', 'pubrel', 'pubcomp', 'unsuback'];

for (var i = 0; i < pubs.length; i++) {
  module.exports[pubs[i]] = function(buf, packet) {
    var len = buf.length
      , pos = 0;

    packet.messageId = parse_num(buf, len, pos);
    if (packet.messageId === null) return null;
    
    buf = len = pos = null;

    return packet;
  };
}

module.exports.subscribe = function(buf, packet) {
  var len = buf.length
    , pos = 0;

  packet.subscriptions = [];

  /* Parse message ID */
  packet.messageId = parse_num(buf, len, pos);
  if(packet.messageId === null) return null;
  pos += 2;
  
  while(pos < len) {
    var topic, qos, topic_and_len;
    
    /* Parse topic */
    topic_and_len = parse_string(buf, len, pos);
    topic = topic_and_len[0];
    if(topic === null) return null;
    pos += topic_and_len[1] + 2;

    /* Parse QoS */
    qos = buf[pos++];
    
    /* Push pair to subscriptions */
    packet.subscriptions.push({topic: topic, qos: qos});
  }
  
  pos = len = buf = null;
  
  return packet;
};

module.exports.suback = function(buf, packet) {
  var len = buf.length
    , pos = 0;

    packet.granted = [];
    
    /* Parse message ID */
    packet.messageId = parse_num(buf, len, pos);
    if(packet.messageId === null) return null;
    pos += 2;
    
    while(pos < len) {
      packet.granted.push(buf[pos++]);
    }
    
    pos = len = buf = null;
    
    return packet;
};

module.exports.unsubscribe = function(buf, packet) {
  var len = buf.length
    , pos = 0;

  packet.unsubscriptions = [];

  /* Parse message ID */
  packet.messageId = parse_num(buf, len, pos);
  if(packet.messageId === null) return null;
  pos += 2;
  
  while(pos < len) {
    var topic, topic_and_len;
    
    /* Parse topic */
    topic_and_len = parse_string(buf, len, pos);
    topic = topic_and_len[0];
    if(topic === null) return null;
    pos += topic_and_len[1] + 2;

    /* Push topic to unsubscriptions */
    packet.unsubscriptions.push(topic);
  }
  
  pos = len = buf = null;
  
  return packet;  
};

var empties = ['pingreq', 'pingresp', 'disconnect'];

for (var i = 0; i < empties.length; i++) {
  module.exports[empties[i]] = function(buf, packet) {
    buf = null;
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
  return [buf.toString('utf8', pos + 2, pos + length + 2), length];
}
