
var mqttPacket = require('mqtt-packet')
  , Connection = mqttPacket.connection
  , inherits   = require('inherits');

function emitPacket(packet) {
  this.emit(packet.cmd, packet);
}

function MQTTConnection(duplex, opts) {
  if (!(this instanceof MQTTConnection)) {
    return new MQTTConnection(duplex, opts);
  }

  Connection.call(this, duplex, opts);

  this.stream = duplex;

  this.on('data', emitPacket);

  duplex.on('close', this.emit.bind(this, 'close'));
}

inherits(MQTTConnection, Connection);

[ 'connect',
  'connack',
  'publish',
  'puback',
  'pubrec',
  'pubrel',
  'pubcomp',
  'subscribe',
  'suback',
  'unsubscribe',
  'unsuback',
  'pingreq',
  'pingresp',
  'disconnect'].forEach(function(cmd) {
    MQTTConnection.prototype[cmd] = function(opts, cb) {
      opts = opts || {};
      opts.cmd = cmd;
      this.write(opts, cb);
    }
  });


module.exports = MQTTConnection;
