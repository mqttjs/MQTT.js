'use strict';
var MqttClient = require('../client'),
  url = require('url'),
  xtend = require('xtend'),
  protocols = {},
  protocolList = [];

if ('browser' !== process.title) {
  protocols.mqtt = require('./tcp');
  protocols.tcp = require('./tcp');
  protocols.ssl = require('./tls');
  protocols.tls = require('./tls');
  protocols.mqtts = require('./tls');
}

protocols.ws = require('./ws');
protocols.wss = require('./ws');

protocolList = [
  'mqtt',
  'mqtts',
  'ws',
  'wss'
];


/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
function parseAuthOptions (opts) {
  var matches;
  if (opts.auth) {
    matches = opts.auth.match(/^(.+):(.+)$/);
    if (matches) {
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
function connect (brokerUrl, opts) {

  if (('object' === typeof brokerUrl) && !opts) {
    opts = brokerUrl;
    brokerUrl = null;
  }

  opts = opts || {};

  if (brokerUrl) {
    opts = xtend(url.parse(brokerUrl, true), opts);
    opts.protocol = opts.protocol.replace(/\:$/, '');
  }

  // merge in the auth options if supplied
  parseAuthOptions(opts);

  // support clientId passed in the query string of the url
  if (opts.query && 'string' === typeof opts.query.clientId) {
    opts.clientId = opts.query.clientId;
  }

  if (opts.cert && opts.key) {
    if (opts.protocol) {
      if (-1 === ['mqtts', 'wss'].indexOf(opts.protocol)) {
        /*
         * jshint and eslint
         * complains that break from default cannot be reached after throw
         * it is a foced exit from a control structure
         * maybe add a check after switch to see if it went through default
         * and then throw the error
        */
        /*jshint -W027*/
        /*eslint no-unreachable:1*/
        switch (opts.protocol) {
          case 'mqtt':
            opts.protocol = 'mqtts';
            break;
          case 'ws':
            opts.protocol = 'wss';
            break;
          default:
            throw new Error('Unknown protocol for secure conenction: "' + opts.protocol + '"!');
            break;
        }
        /*eslint no-unreachable:0*/
        /*jshint +W027*/
      }
    } else {
      // don't know what protocol he want to use, mqtts or wss
      throw new Error('Missing secure protocol key');
    }
  }

  if (!protocols[opts.protocol]) {
    opts.protocol = protocolList.filter(function (key) {
      return 'function' === typeof protocols[key];
    })[0];
  }

  if (false === opts.clean && !opts.clientId) {
    throw new Error('Missing clientId for unclean clients');
  }


  function wrapper (client) {
    if (opts.servers) {
      if (!client._reconnectCount || client._reconnectCount === opts.servers.length) {
        client._reconnectCount = 0;
      }

      opts.host = opts.servers[client._reconnectCount].host;
      opts.port = opts.servers[client._reconnectCount].port;

      client._reconnectCount++;
    }

    return protocols[opts.protocol](client, opts);
  }

  return new MqttClient(wrapper, opts);
}

module.exports = connect;
module.exports.connect = connect;
