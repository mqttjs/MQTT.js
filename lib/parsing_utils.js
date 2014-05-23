
module.exports.parseEncodedPayload = function(parser, buf, encoding, packet) {

  // Parse the payload
  /* No checks - whatever remains in the packet is the payload */
  if (encoding !== 'binary') {
    packet.payload = buf.toString(encoding, parser._pos, parser._len);
  } else {
    packet.payload = buf.slice(parser._pos, parser._len);
  }
};

module.exports.toString = function(parser, buf, length, encoding) {
  if (encoding !== 'binary') {
    return buf.toString(encoding || 'utf8', parser._pos, parser._pos + length);
  } else {
    return buf.slice(parser._pos, parser._pos + length);
  }
};
