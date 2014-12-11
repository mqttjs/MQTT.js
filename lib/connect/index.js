
var MqttClient      = require('../client')
  , url             = require('url')
  , xtend           = require('xtend')
  , protocols       = {};

if (process.title !== 'browser') {
  protocols.mqtt  = require('./tcp');
  protocols.tcp   = require('./tcp');
  protocols.ssl   = require('./tls');
  protocols.tls   = require('./tls');
  protocols.mqtts = require('./tls');
}
protocols.ws    = require('./ws');

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
function parseAuthOptions(opts) {
  if(opts.auth){
    var matches = opts.auth.match(/^(.+):(.+)$/);
    if(matches) {
      opts.username = matches[1];
      opts.password = matches[2];
    } else {
      opts.username = opts.auth;
    }
  }
}

/**
 * connect - connect to an MQTT broker.
 *
 * @param {String} [brokerUrl] - url of the broker, optional
 * @param {Object} opts - see MqttClient#constructor
 */
function connect(brokerUrl, opts) {

  if (typeof brokerUrl === 'object' && !opts) {
    opts = brokerUrl
    brokerUrl = null
  }

  opts = opts || {};

  if (brokerUrl) {
    opts = xtend(url.parse(brokerUrl, true), opts);
  }

  // merge in the auth options if supplied
  parseAuthOptions(opts);

  // support clientId passed in the query string of the url
  if (opts.query && 'string' === typeof opts.query.clientId) {
    opts.clientId = opts.query.clientId;
  }

  if (!protocols[opts.protocol]) {
    opts.protocol = Object.keys(protocols).filter(function(key) {
      return typeof protocols[key] === 'function';
    })[0];
  }

  if (opts.clean === false && !opts.clientId) {
    throw new Error("Missing clientId for unclean clients");
  }

  return new MqttClient(protocols[opts.protocol](opts), opts);
}

module.exports = connect;
module.exports.connect = connect;
