var events = require('events')
  , util = require('util')
  , protocol = require('./protocol')
  , generate = require('./generate')
  , parse = require('./parse');

var Connection = module.exports = 
function Connection(stream, server) {
  this.server = server;

  if (!require("stream").Readable) {
    // we are in node < 0.10
    // let's wrap the stream
    var wrapper = new require("readable-stream").Readable();
    wrapper.wrap(stream);
    this.stream = wrapper;
    stream.on("connect", 
        this.stream.emit.bind(this.stream, "connect"));
  } else {
    this.stream = stream;
  }

  this.buffer = null;
  this.packet = {};
  this.skip = false;
  var that = this;

  // we might be using the wrapper here
  this.stream.on('readable', function () {
    if (!that.skip) {
      that.parse();
    }
    that.skip = false;
  });

  events.EventEmitter.call(this);
};
util.inherits(Connection, events.EventEmitter);

Connection.prototype.parse = function() {
  var byte = null, bytes = [], result;
  
  // Fresh packet - parse the header
  if (!this.packet.cmd) {
    byte = this.stream.read(1);
    if (byte === null) {
      return;
    }
    parse.header(byte, this.packet);
  }

  if (!this.packet.length) {
    var tmp = {mul: 1, length: 0};
    byte = this.stream.read(1);

    if (byte === null) {
      return;
    }

    bytes.push(byte);
    var pos = 1;

    while (pos++ < 4) {

      tmp.length += 
        tmp.mul * (byte[0] & protocol.LENGTH_MASK);
      tmp.mul *= 0x80;

      if ((byte[0] & protocol.LENGTH_FIN_MASK) === 0) {
        break;
      }

      byte = this.stream.read(1);
      if (byte === null) {
        this.skip = true;
        this.stream.unshift(Buffer.concat(bytes));
        return;
      }
      bytes.push(byte);
    }

    this.packet.length = tmp.length;
  }

  // Do we have a payload?
  if (this.packet.length > 0) {
    var payload = this.stream.read(this.packet.length);

    // Do we have enough data to complete the payload?
    if (payload === null) {
      // Nope, wait for more data 
      return;
    }
  }

  // Finally we can parse the payload
  result = parse[this.packet.cmd](
    payload,
    this.packet
  );

  // Clear packet state
  this.packet = {};

  // Emit packet or error
  if (result instanceof Error) {
    this.emit("error", result);
  } else {
    this.emit(result.cmd, result);
  }

  // Parse remaining messages
  this.parse();
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
