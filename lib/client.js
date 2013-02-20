/**
 * Module dependencies
 */

var Connection = require('./connection')
  , events = require('events')
  , util = require('util')
  , net = require('net');

/**
 * Defaults
 */

var defaultPort = 1883
  , defaultHost = 'localhost';

/**
 * MqttClient constructor
 *
 * @param <Number> [port] - broker port
 * @param <String> [host] - broker hostname
 * @param <Object> [options] - connection options (see Connection#connect)
 */
var MqttClient = module.exports = 
function MqttClient(port, host, options) {
  if (!this instanceof MqttClient) { 
    return new MqttClient(port, host, options);
  }

  var self = this;

  if ('object' === typeof port) {
    // new MqttClient({client: asdf, keepalive:1234})
    options = port;
    port = defaultPort;
    host = defaultHost;
  } else if ('object' === typeof host) {
    // new MqttClient(1234, {client:asdf, keepalive:1234})
    options = host;
    host = defaultHost;
  }

  this.net_client = new net.Socket();
  this.mqtt_conn = new Connection(this.net_client, null); 

  this.net_client.connect(port, host, function () {
    self.mqtt_conn.connect(options);
  });

  this.mqtt_conn.on('connack', function(packet) {
    var rc = packet.returnCode;

    if (rc === 0) {
      self.emit('connect');
    } else {
      // TODO: more informative
      self.emit('error', new Error('Connect error: ' + rc));
    }
  });
  events.EventEmitter.call(this);
};
util.inherits(MqttClient, events.EventEmitter);

/**
 * publish - publish <message> to <topic>
 *
 * @param <String> topic - topic to publish to
 * @param <String, Buffer> message - message to publish
 * @param <Object> [opts] - publish options, includes:
 *    <Number> qos - qos level to publish on
 *    <Boolean> retain - whether or not to retain the message
 * @param <Function> [callback] - function(err, success){}
 *    called when publish succeeds or fails
 * @api public
 */
MqttClient.prototype.publish = 
function(topic, message, opts, callback) {

};

/**
 * subscribe - subscribe to <topic>
 *
 * @param <String> topic - topic to subscribe to
 * @param <Object> [opts] - subscription options, includes:
 *    <Number> qos - subscribe qos level
 * @api public
 */
MqttClient.prototype.subscribe = 
function(topic, opts, callback) {

};
