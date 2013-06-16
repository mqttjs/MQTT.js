var events = require('events')
  , util = require('util')
  , protocol = require('./protocol')
  , generate = require('./generate')
  , parse = require('./parse');

var Writable = require("stream").Writable

if (!Writable) {
  Writable = require("readable-stream").Writable;
}

var Connection = module.exports = 
function Connection(stream, server) {
  this.server = server;

  this.generate = generate;
  var that = this;

  events.EventEmitter.call(this);

  this.reconnect(stream);
};
util.inherits(Connection, events.EventEmitter);

Connection.prototype._setupParser = function() {
  this.parser = this.stream.pipe(new PacketParser({
    connection: this
  }));
};

Connection.prototype.reconnect = function(stream) {
  var that = this;

  this.stream = stream;
  this._setupParser();
};

for (var k in protocol.types) {
  var v = protocol.types[k];

  var fun = "" +
  "   var p = this.generate." + v +"(arguments[0]); " +
  "   if (p instanceof Error) { " +
  "     this.emit('error', p) " +
  "   } else { " +
  "     this.stream.write(p); " +
  "   } "
  " } ";

  Connection.prototype[v] = new Function(fun);
}

function PacketParser(options) {

  if (!(this instanceof PacketParser)) {
    return new PacketParser(options);
  }

  Writable.call(this, options);

  this.conn = options.connection;
  this.newPacket();
}

PacketParser.prototype = Object.create(
  Writable.prototype,
  { constructor: { value: PacketParser } }
);

PacketParser.prototype.newPacket = function() {
  this.packet = {};
  this.tmp = { pos: 1, mul: 1, length: 0};
  this.partialPayload = null;
}

PacketParser.prototype._write = function(data, encoding, done) {

  var byte = null, result, index = 0;
  
  // Fresh packet - parse the header
  if (!this.packet.cmd) {
    // there is at least one byte in the buffer
    parse.header(data, this.packet);
    index++;
  }

  if (!this.packet.length) {

    if (data.length <= index) {
      done();
      return;
    }

    byte = data[index++];

    while (this.tmp.pos++ < 4) {
      this.tmp.length += 
        this.tmp.mul * (byte & protocol.LENGTH_MASK);
      this.tmp.mul *= 0x80;

      if ((byte & protocol.LENGTH_FIN_MASK) === 0) {
        break;
      }

      if (data.length <= index) {
        done();
        return;
      }

      byte = data[index++];
    }

    this.packet.length = this.tmp.length;
  }

  // Do we have a payload?
  if (this.packet.length > 0) {

    // do we have a partial payload?
    if (this.partialPayload) {
      data = Buffer.concat([this.partialPayload, data]);
    }

    // Do we have enough data to complete the payload?
    if (this.packet.length > data.length - index) {
      // Nope, wait for more data 
      this.partialPayload = data.slice(index);
      done();
      return;
    }
  }

  // Finally we can parse the payload
  result = parse[this.packet.cmd](
    data.slice(index, index + this.packet.length),
    this.packet
  );

  index += this.packet.length;

  // Clear packet state
  this.newPacket();

  // Emit packet or error
  if (result instanceof Error) {
    this.conn.emit("error", result);
  } else {
    this.conn.emit(result.cmd, result);
  }

  // do we have more data?
  if (data.length > index) {
    this._write(data.slice(index), encoding, done);
  } else {
    done()
  }
};
