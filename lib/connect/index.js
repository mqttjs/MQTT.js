'use strict'

var MqttClient = require('../client')
var url = require('url')
var xtend = require('xtend')
var protocols = {}

if (process.title !== 'browser') {
  protocols.mqtt = require('./tcp')
  protocols.tcp = require('./tcp')
  protocols.ssl = require('./tls')
  protocols.tls = require('./tls')
  protocols.mqtts = require('./tls')
}

protocols.ws = require('./ws')
protocols.wss = require('./ws')

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
function parseAuthOptions (auth, opts) {
  var matches
  if (auth) {
    matches = auth.match(/^(.+):(.+)$/)
    if (matches) {
      opts.username = matches[1]
      opts.password = matches[2]
    } else {
      opts.username = auth
    }
  }
}

function parseBrokerUrl (brokerUrl) {
  var opts = {}
  var parsed = url.parse(brokerUrl, /* parseQueryString = */ true)
  if (parsed.port != null) {
    opts.port = Number(parsed.port)
  }
  if (parsed.protocol) {
    opts.protocol = parsed.protocol.replace(/:$/, '')
  }

  // Parse username/password
  parseAuthOptions(parsed.auth, opts)

  // Support clientId passed in the query string of the url
  if (parsed.query && typeof parsed.query.clientId === 'string') {
    opts.clientId = parsed.query.clientId
  }

  return xtend(
    opts,
      // username
      // password
      // port
      // protocol
      // clientId
    {
      // NOTE: we use JUST the host, not parsed.host which includes the port
      host: parsed.hostname,
      path: parsed.path || '/',
      // TODO: remove
      hostname: parsed.hostname
    })
}

function warnHostNameDeprecation () {
  // The test uses hostname twice, once in `connect` when checking passed in
  // opts and once in the acutall test to check the value is correct.
  console.warn('Use of mqtt.Client ' +
    '`opts.hostname` is deprecated. Use `opts.host`.\n' +
    // Note we clone options in connect/ssl and delete 'hostname'
    // so hostname isn't used.
    patchHostName.usages +
    ' usages detected.')
}

patchHostName.usages = 0
function patchHostName (opts) {
  if (!patchHostName.setHandler) {
    process.once('exit', warnHostNameDeprecation)
    patchHostName.setHandler = true
  }

  if (opts.hostname) {
    var _hostname = opts.hostname
    delete opts['hostname']
    Object.defineProperty(opts, 'hostname', {
      get: function () {
        patchHostName.usages++
        return _hostname
      },
      set: function (value) {
        _hostname = value
      },
      configurable: true,
      enumerable: true
    })
  }
}

/**
 * connect - connect to an MQTT broker.
 *
 * @param {String} [brokerUrl] - url of the broker, optional
 * @param {Object} opts - see MqttClient#constructor
 */
function connect (brokerUrl, opts) {
  if ((typeof brokerUrl === 'object') && !opts) {
    opts = brokerUrl
    brokerUrl = null
  }

  opts = opts || {}

  if (opts.hostname) {
    opts.host = opts.hostname
    patchHostName.usages++
    // For testing
    warnHostNameDeprecation()
  }

  if (brokerUrl) {
    // Options object always override brokerUrl specified options
    opts = xtend(parseBrokerUrl(brokerUrl), opts)
    if (!opts.protocol) {
      throw new Error('Missing protocol')
    }
  }

  patchHostName(opts)

  // Someone out in the wild might be using {auth: 'user:pass'} out in the wild
  // Keep old behaviour? Tests actually pass without this.
  parseAuthOptions(opts.auth, opts)

  if (opts.cert && opts.key) {
    if (opts.protocol) {
      if (['mqtts', 'wss'].indexOf(opts.protocol) === -1) {
        /*
         * jshint and eslint
         * complains that break from default cannot be reached after throw
         * it is a foced exit from a control structure
         * maybe add a check after switch to see if it went through default
         * and then throw the error
        */
        /* jshint -W027 */
        /* eslint no-unreachable:1 */
        switch (opts.protocol) {
          case 'mqtt':
            opts.protocol = 'mqtts'
            break
          case 'ws':
            opts.protocol = 'wss'
            break
          default:
            throw new Error('Unknown protocol for secure connection: "' + opts.protocol + '"!')
            break
        }
        /* eslint no-unreachable:0 */
        /* jshint +W027 */
      }
    } else {
      // don't know what protocol he want to use, mqtts or wss
      throw new Error('Missing secure protocol key')
    }
  }

  if (!protocols[opts.protocol]) {
    var isSecure = ['mqtts', 'wss'].indexOf(opts.protocol) !== -1
    opts.protocol = [
      'mqtt',
      'mqtts',
      'ws',
      'wss'
    ].filter(function (key, index) {
      if (isSecure && index % 2 === 0) {
        // Skip insecure protocols when requesting a secure one.
        return false
      }
      return (typeof protocols[key] === 'function')
    })[0]
  }

  if (opts.clean === false && !opts.clientId) {
    throw new Error('Missing clientId for unclean clients')
  }

  function wrapper (client) {
    if (opts.servers) {
      if (!client._reconnectCount || client._reconnectCount === opts.servers.length) {
        client._reconnectCount = 0
      }

      opts.host = opts.servers[client._reconnectCount].host
      opts.port = opts.servers[client._reconnectCount].port

      client._reconnectCount++
    }

    return protocols[opts.protocol](client, opts)
  }

  return new MqttClient(wrapper, opts)
}

module.exports = connect
module.exports.connect = connect
module.exports.MqttClient = MqttClient
