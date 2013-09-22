var bops = require('bops');

module.exports.parseEncodedPayload = function(parser, buf, encoding, packet) {
  buf = bops.subarray(buf, parser._pos, parser._len);

  if (encoding !== 'binary') {
    buf = bops.to(buf, encoding);
  }

  packet.payload = buf;
};

module.exports.toString = function(parser, buf, length) {
  return bops.to(bops.subarray(buf, parser._pos, parser._pos + length), 'utf8');
};
