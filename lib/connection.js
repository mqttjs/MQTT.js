
var mqttPacket = require('mqtt-packet')
  , Connection = mqttPacket.connection
  , inherits   = require('inherits');

function MQTTConnection(duplex, opts) {
  if (!(this instanceof MQTTConnection)) {
    return new MQTTConnection(duplex, opts);
  }

  Connection.call(this, duplex, opts);

  this.on('data', function(packet) {
    this.emit(packet.cmd, packet);
  });
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
      opts.cmd = cmd;
      this.write(opts, cb);
    }
  });


module.exports = MQTTConnection;
