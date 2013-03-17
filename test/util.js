/**
 * Requires
 */

var util = require('util')
  , Stream = require('stream').Transform;

if (!Stream) {
  Stream = require("readable-stream").Transform;
}

/**
 * Export TestStream
 */

var TestStream = module.exports.TestStream = 
function TestStream() {
  if (!this instanceof TestStream) return new TestStream();

  Stream.call(this);
};
util.inherits(TestStream, Stream);

TestStream.prototype._transform = function(buffer, encoding, callback) {
  if (!Buffer.isBuffer(buffer)) {
    buffer = new Buffer(buffer, encoding);
  }
  setTimeout(function () {
    callback(null, buffer);
  }, 10);
};
