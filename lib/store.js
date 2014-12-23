
var PassThrough = require('readable-stream').PassThrough
  , streamsOpts = { objectMode: true };

/**
 * In-memory implementation of the message store
 * This can actually be saved into files.
 *
 */
function Store() {
  if (!(this instanceof Store)) {
    return new Store();
  }

  this._inflights = {}
}

/**
 * Adds a packet to the store, a packet is
 * anything that has a messageId property.
 *
 */
Store.prototype.put = function(packet, cb) {
  this._inflights[packet.messageId] = packet;

  if (cb) {
    cb();
  }

  return this;
};

/**
 * Creates a stream with all the packets in the store
 *
 */
Store.prototype.createStream = function() {
  var stream  = new PassThrough(streamsOpts)
    , ids     = Object.keys(this._inflights)
    , i       = 0;

  for (i = 0; i < ids.length; i++) {
    stream.write(this._inflights[ids[i]]);
  }

  stream.end();

  return stream;
};

/**
 * deletes a packet from the store.
 */
Store.prototype.del = function(packet, cb) {
  packet = this._inflights[packet.messageId];
  if (packet) {
    delete this._inflights[packet.messageId];
    cb(null, packet);
  } else if (cb) {
    cb(new Error('missing packet'));
  }

  return this;
};

/**
 * get a packet from the store.
 */
Store.prototype.get = function(packet, cb) {
  packet = this._inflights[packet.messageId];
  if (packet) {
    cb(null, packet);
  } else if (cb) {
    cb(new Error('missing packet'));
  }

  return this;
};

/**
 * Close the store
 */
Store.prototype.close = function(cb) {
  this._inflights = null;
  if (cb) {
    cb();
  }
};

module.exports = Store
