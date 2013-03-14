var events = require('events')
  , util = require('util')
  , protocol = require('./protocol')
  , generate = require('./generate')
  , parse = require('./parse')
  , bufferSize = 1024; // we need fast buffers!!

var Connection = module.exports = 
function Connection(stream, server) {
  this.server = server;
  this.stream = stream;
  this.buffer = null;
  this.packet = {};
  var that = this;
  this.stream.on('data', function (buf) {
    that.parse(buf);
  });

  events.EventEmitter.call(this);
};
util.inherits(Connection, events.EventEmitter);

Connection.prototype.parse = function(buf) {
  var pos = 0
    , len = buf.length
    , remain = this.buffer;

  if (remain !== null) {
    // Set pos and len
    pos = remain.read;
    len = remain.written
    // Do we have enough space for the incoming data?
    if (len + buf.length > remain.length) {
      // Then buf does not fit in the free space left
      var previousPacketPart = len - pos;
      var totalReceivedSize = previousPacketPart + buf.length;

      // Is remain big enough for the incoming data
      var newBuffer = null;
      if (totalReceivedSize > remain.length) {
        // allocate a bigger buffer, with some free space
        newBuffer = new Buffer(totalReceivedSize * 2);
      } else {
        // rotate the buffer, so there is free space at the end
        newBuffer = remain;
      }

      remain.copy(newBuffer, 0, pos, len) 
      newBuffer.written = previousPacketPart;
      newBuffer.read = 0;
      remain = newBuffer;
    }
    
    // Copy incoming data into the internal buffer
    buf.copy(remain, len);
    len += buf.length;
  } else {
    remain = buf;
  }
  
  while (pos < len) {
    // Fresh packet - parse the header
    if (!this.packet.cmd) {
      parse['header'](remain.slice(pos, pos + 1), 
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
          tmp.mul * (remain[pos] & protocol.LENGTH_MASK);
        tmp.mul *= 0x80;
      } while (
          // Loop over length until first bit is set
          (remain[pos++] & protocol.LENGTH_FIN_MASK) !== 0
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
        remain.slice(pos, this.packet.length + pos), 
        this.packet
      );
      // Indicate that we've read all the data
      pos += this.packet.length;
      // Emit packet and reset connection state
      this.emit(this.packet.cmd, this.packet);
      this.packet = {};
    }
  }
  
  // Processed all the data in the buffer and read length
  // then we can clean up the buffer
  if (pos === len) {
    this.buffer = null;
  } else {
    remain.written = len;
    remain.read = pos;
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
