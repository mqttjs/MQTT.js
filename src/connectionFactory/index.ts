import net from 'net'
import { Duplex } from 'stream'
import tls from 'tls'
import { URL } from "url";
import { ConnectOptions } from '../interfaces/connectOptions.js'
import { buildWebSocketStream } from './buildWebSocketStream.js'
import { WebSocketOptions } from './interfaces/webSocketOptions.js'


const logger = require('pino')()

export function connectionFactory (options: ConnectOptions): Duplex {
  const brokerUrl: URL = options.brokerUrl as URL
  const tlsOptions = options.tlsOptions
  switch (brokerUrl.protocol) {
    case 'tcp': {
      const port: number = parseInt(brokerUrl.port) || 1883
      const host: string = brokerUrl.hostname || brokerUrl.host || 'localhost'
      
      // logger('port %d and host %s', port, host)
      return net.createConnection(port, host)
    }
    case 'tls': {
      const port: number = parseInt(brokerUrl.port) || 8883
      const host: string = brokerUrl.hostname || brokerUrl.host || 'localhost'
      const servername: string = brokerUrl.host

      logger(`port ${port} host ${host} servername ${servername}`)

      const connection: tls.TLSSocket = tls.connect({port: port, host: host, servername: servername, ...options.tlsOptions})
      /* eslint no-use-before-define: [2, "nofunc"] */
      connection.on('secureConnect', function () {
        if (tlsOptions as any['rejectUnauthorized'] && !connection.authorized) {
          connection.emit('error', new Error('TLS not authorized'))
        } else {
          connection.removeListener('error', handleTLSerrors)
        }
      })

      const handleTLSerrors = (err: Error) => {
        // How can I get verify this error is a tls error?
        // TODO: In the old version this was emitted via the client. 
        // We need to make this better.
        if (options.tlsOptions as any['rejectUnauthorized']) {
          connection.emit('error', err)
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
    case 'ws': {
      const url = options.transformWsUrl ? options.transformWsUrl(options.brokerUrl) : options.brokerUrl as URL
      const websocketSubProtocol =
      (options.protocolId === 'MQIsdp') && (options.protocolVersion === 3)
        ? 'mqttv3.1'
        : 'mqtt'  
      const webSocketOptions: WebSocketOptions = {
        url: url,
        hostname: url.hostname || 'localhost',
        port: url.port || url.protocol === 'wss' ? 443 : 80,
        protocol: url.protocol,
        protocolId: options.protocolId,
        websocketSubProtocol: websocketSubProtocol,
        path: url.pathname || '/',
        wsOptions: options.wsOptions || {}
      }
      const wsStream = buildWebSocketStream(webSocketOptions)
      return wsStream
    } default:
    throw new Error('Unrecognized protocol')
  }
}

