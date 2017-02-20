'use strict'
import * as tls from 'tls'
import {MqttClient, ClientOptions} from '../client'

function buildBuilder (mqttClient: MqttClient, opts: ClientOptions) {
  let connection: tls.ClearTextStream
  opts.port = '' + (opts.port || 8883)
  opts.host = opts.hostname || opts.host || 'localhost'

  opts.rejectUnauthorized = opts.rejectUnauthorized !== false

  connection = tls.connect({...opts, port: +opts.port} as tls.ConnectionOptions)
  /* eslint no-use-before-define: [2, "nofunc"] */
  connection.on('secureConnect', function () {
    if (opts.rejectUnauthorized && !connection.authorized) {
      connection.emit('error', new Error('TLS not authorized'))
    } else {
      connection.removeListener('error', handleTLSerrors)
    }
  })

  function handleTLSerrors (err: Error) {
    // How can I get verify this error is a tls error?
    if (opts.rejectUnauthorized) {
      mqttClient.emit('error', err)
    }

    // close this connection to match the behaviour of net
    // otherwise all we get is an error from the connection
    // and close event doesn't fire. This is a work around
    // to enable the reconnect code to work the same as with
    // net.createConnection
    connection.end()
  }

  connection.on('error', handleTLSerrors)
  return connection
}

export = buildBuilder
