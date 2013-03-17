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
    stream.on("connect", this.stream.emit.bind(this.stream, "connect"));
  } else {
    this.stream = stream;
  }

  this.buffer = null;
  this.packet = {};
  var that = this;

  // we might be using the wrapper here
  this.stream.on('readable', function () {
    that.parse();
  });

  events.EventEmitter.call(this);
};
util.inherits(Connection, events.EventEmitter);

Connection.prototype.parse = function() {
  var byte = null;
  
  // Fresh packet - parse the header
  if (!this.packet.cmd) {
    byte = this.stream.read(1);
    if (byte === null) {
      return;
    }
    parse.header(byte, this.packet);
  }

  // FIXME we are assuming we can read the full
  // length header in one shot
  if (!this.packet.length) {
    var tmp = {mul: 1, length: 0};
    byte = this.stream.read(1);
    var pos = 1;

    while (pos++ < 4) {

      tmp.length += 
        tmp.mul * (byte[0] & protocol.LENGTH_MASK);
      tmp.mul *= 0x80;

      byte = this.stream.read(1);
      if(byte === null) {
        break;
      }
      if ((byte[0] & protocol.LENGTH_FIN_MASK) === 0) {
        this.stream.unshift(byte);
        break;
      }
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
  parse[this.packet.cmd](
    payload,
    this.packet
  );

  // Emit packet and reset connection state
  this.emit(this.packet.cmd, this.packet);
  this.packet = {};

  // there might be one more message
  // to parse.
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
