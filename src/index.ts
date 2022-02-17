/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */

import { MqttClient } from './client.js'
import { ConnectOptions } from './interfaces/connectOptions.js'
import { protocols } from './utils/constants.js'
import { logger } from './utils/logger.js'

import { URL } from 'url'

/**
 * connect()
 * Connect will:
 *   1) Validate the options provided by the user.
 *   2) Instantiate a new client.
 *   3) Return the client to the user.
 */
function connect (options: ConnectOptions) {
  logger.info(`validating options...`)
  if (typeof(options.brokerUrl) === 'string') {
    options.brokerUrl = new URL(options.brokerUrl) 
  }

  if (!options?.brokerUrl?.protocol) {
    throw new Error(
      `Missing protocol. \
      To provide a protocol, you have two options:\
      - Format the brokerUrl with a protocol, for example: 'mqtt://test.mosquitto.org'.
      - Pass in the protocol via the protocol option.`)
  }

  const validationErr: Error | undefined = _validateProtocol(options)
  if (validationErr) {
    throw validationErr
  }

  const client = MqttClient.connect(options)
  return client
}

function _validateProtocol(opts: ConnectOptions): Error | undefined {
  logger.info(`validating protocol options...`)
  if (opts.tlsOptions && 'cert' in opts.tlsOptions && 'key' in opts.tlsOptions) {
    const urlProtocol = (opts.brokerUrl as URL).protocol
    if (urlProtocol) {
      if (protocols.secure.indexOf(urlProtocol) === -1) {
        const protocolError: Error = formatSecureProtocolError(urlProtocol)
        return protocolError
      }
    } else {
      // A cert and key was provided, however no protocol was specified, so we will throw an error.
      // TODO: Git Blame on this line. I don't understand the error message at all.
      return new Error('Missing secure protocol key')
    }
  }
  return undefined
}

function formatSecureProtocolError(protocol: string): Error {
  logger.info('secure protocol error! formatting secure protocol error... ')
  let secureProtocol: string;
  switch (protocol) {
    case 'mqtt':
      secureProtocol = 'mqtts'
      break
    case 'ws':
      secureProtocol = 'wss'
      break
    default:
      return new Error('Unknown protocol for secure connection: "' + protocol + '"!')
  }
  return new Error(
    `user provided cert and key , but protocol ${protocol} is insecure. 
    Use ${secureProtocol} instead.`)
}

export { connect }
