var events = require('events')
  , util = require('util')
  , protocol = require('./protocol')
  , generate = require('./generate')
  , parse = require('./parse')
  , Stream = require("stream").Stream
  , Writable = require("stream").Writable

if (!Writable) {
  Writable = require("readable-stream").Writable;
}

var Connection = module.exports =
function Connection() {
  if (!(this instanceof Connection)) {
    return new Connection();
  }

  this.generate = generate;

  var options = {};

  options.objectMode = typeof global.WebSocket !== 'undefined';

  Writable.call(this, options);

  this._newPacket();

  this._packetEncoding = "utf8";

  var that = this;

  this.on("pipe", function(source) {
    that.stream = source;
  });
};

util.inherits(Connection, Writable);

Object.keys(protocol.types).forEach(function(k) {
  var v = protocol.types[k];
  Connection.prototype[v] = function shim(opts) {
    var p = generate[v](opts);
    if (p instanceof Error) {
      this.emit('error', p)
    } else {
      this.stream.write(p);
    }
  };
});

Connection.prototype.setPacketEncoding = function (encoding) {
  this._packetEncoding = encoding;
  return this;
};

Connection.prototype._newPacket = function() {
  this.packet = {};
  this.tmp = { pos: 1, mul: 1, length: 0};
  this.partialPayload = null;
}

Connection.prototype._parseHeader = function() {
  // Fresh packet - parse the header
  if (!this.packet.cmd) {
    // there is at least one byte in the buffer
    parse.header(this.data, this.packet);
    this.index++;
  }

  return true;
};

Connection.prototype._parseLength = function() {
  var result = true, data = this.data, readByte;

  if (this.packet.length === undefined) {

    if (data.length <= this.index) {
      result = false;
    } else {

      readByte = data.readUInt8(this.index++);

      while (this.tmp.pos++ <= 4) {
        this.tmp.length +=
          this.tmp.mul * (readByte & protocol.LENGTH_MASK);
        this.tmp.mul *= 0x80;

        if ((readByte & protocol.LENGTH_FIN_MASK) === 0) {
          break;
        }

        if (data.length <= this.index) {
          result = false;
          break;
        }

        readByte = data.readUInt8(this.index++);
      }

      if (result) {
        this.packet.length = this.tmp.length;
      }
    }
  }

  return result;
};

Connection.prototype._readPayload = function() {
  var result = true;

  // Do we have a payload?
  if (this.packet.length > 0) {

    // do we have a partial payload?
    if (this.partialPayload) {
      this.data = Buffer.concat([this.partialPayload, this.data]);
      this.partialPayload = null;
    }

    // Do we have enough data to complete the payload?
    if (this.packet.length > this.data.length - this.index) {

      // Nope, wait for more data
      if (this.index < this.data.length) {
        this.partialPayload = this.data.slice(this.index);
      }

      result = false;
    }
  }

  return result;
};

Connection.prototype._parsePayload = function() {
  var buf = this.data.slice(this.index, this.index + this.packet.length);
  var result = null;
  this.index += this.packet.length;
  if (parse[this.packet.cmd]) {
    result = parse[this.packet.cmd](buf, this.packet, this._packetEncoding);
  }
  return result;
}

Connection.prototype._write = function(data, encoding, done) {

  var byte = null, result;

  // needed to handle UInt8ArrayViewS in browsers
  // https://github.com/mcollina/mows/issues/10
  if (!Buffer.isBuffer(data)) {
    data = new Buffer(data);
  }

  this.index = 0;
  this.data = data;

  var parsing = this._parseHeader(data) &&
                this._parseLength(data) &&
                this._readPayload(data);

  if (parsing) {
    // Finally we can parse the payload
    result = this._parsePayload(parse);

    // Clear packet state
    this._newPacket();

    // Emit packet or error
    if (result instanceof Error) {
      this.emit("error", result);
    } else {
      this.emit(result.cmd, result);
    }

    var that = this;

    // do we have more data?
    if (that.data.length > that.index) {
      that._write(that.data.slice(that.index), encoding, done);
    } else {
      done();
    }
  } else {
    // we are waiting for more data
    done();
  }
};
