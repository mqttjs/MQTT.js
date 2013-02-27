var net = require('net')
  , events = require('events')
  , util = require('util')
  , protocol = require('./protocol')
  , generate = require('./generate')
  , parse = require('./parse');

var Connection = module.exports = function Connection(stream, server) {
  this.server = server;
  this.stream = stream;
  this.buffer = new Buffer(1024);
  this.buffer.written = this.buffer.read = 0;
  this.packet = {};
  this.stream.on('data', this.parse.bind(this));

  events.EventEmitter.call(this);
};
util.inherits(Connection, events.EventEmitter);

Connection.prototype.parse = function(buf) {
  // Do we have enough space for the incoming data?
  if (this.buffer.written + buf.length > this.buffer.length) {
    // No, expand the internal buffer
    var newBuffer = new Buffer(this.buffer.written + buf.length);
    this.buffer.copy(newBuffer);
    newBuffer.written = this.buffer.written;
    newBuffer.read = this.buffer.read;
    this.buffer = newBuffer;
  }
  
  // Copy incoming data into the internal buffer
  buf.copy(this.buffer, this.buffer.written);
  this.buffer.written += buf.length;
  
  var pos = this.buffer.read, len = this.buffer.written;
  while (pos < len) {
    // Fresh packet - parse the header
    if (!this.packet.cmd) {
      parse['header'](this.buffer.slice(pos, pos + 1), 
          this.packet
      );
      pos++;
    }
    // Parse the remaining length field
    if (!this.packet.length) {
      var tmp = {mul: 1, length: 0};
      var start_pos = pos;
      do {
        if (pos >= len) {
          // Atomically read remaining length
          pos = start_pos; 
          break;
        }
        tmp.length += 
          tmp.mul * (this.buffer[pos] & protocol.LENGTH_MASK);
        tmp.mul *= 0x80;
      } while (
          // Loop over length until first bit is set
          (this.buffer[pos++] & protocol.LENGTH_FIN_MASK) !== 0
      );
      // Have we got all of the remaining length?
      if (pos > start_pos) {
        // Yes, proceed
        this.packet.length = tmp.length;
      } else {
        // No, wait for more data
        break;
      }
    }
    // Do we have enough data to complete the payload?
    if (len - pos < this.packet.length) {
      // Nope, wait for more data 
      break;
    } else {
      // We've either got enough for >= 1 packet
      parse[this.packet.cmd](
        this.buffer.slice(pos, this.packet.length + pos), 
        this.packet
      );
      // Indicate that we've read all the data
      pos += this.packet.length;
      // Emit packet and reset connection state
      this.emit(this.packet.cmd, this.packet);
      this.packet = {};
    }
  }
  
  this.buffer.read = pos;
  this.buffer.written = len;
  
  // Cut the last packet out of the buffer
  var tmpBuf = new Buffer(this.buffer.written - this.buffer.read);
  this.buffer.copy(
      tmpBuf, // To tmpBuf... 
      0, // at offset 0
      this.buffer.read, // copy from where we read to...
      this.buffer.written // to whatever is left in the buffer
  );

  this.buffer = tmpBuf;
  this.buffer.read = 0;
  this.buffer.written = tmpBuf.length;
  
  // Processed all the data in the buffer and read length
  // (this is needed since as assume length always starts
  // at the buf[1], reset pointers
  if (this.buffer.written === this.buffer.read && 
      this.packet.length) {
    this.buffer.written = this.buffer.read = 0;
  }
};

for (var k in protocol.types) {
  var v = protocol.types[k];

  Connection.prototype[v] = function(type) {
    return function(opts) {
      var p = generate[type](opts);
      if (p instanceof Error) {
        this.emit('error', p)
      } else {
        this.stream.write(p);
      }
    }
  }(v);
}
