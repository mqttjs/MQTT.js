/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */

import { MqttClient } from './client'
import { DefaultMessageIdProvider } from './utils/defaultMessageIdProvider'
import { UniqueMessageIdProvider } from './uniqueMessageIdProvider'

import { URL } from 'url'
import { ConnectOptions } from './interfaces/connectOptions'
import { protocols } from './utils/constants'






/**
 * connect()
 * Connect will:
 *   1) Validate the options provided by the user.
 *   2) Instantiate a new client.
 *   3) Return the client to the user.
 */
function connect (options: ConnectOptions) {
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

  // If there is a colon at the end of the provided protocol, replace it with 
  options.brokerUrl.protocol = options.brokerUrl.protocol.replace(/:$/, '')
  const validationErr: Error | undefined = _validateProtocol(options)
  if (validationErr) {
    throw validationErr
  }

  if (!options.messageIdProvider) {
    options.messageIdProvider = new DefaultMessageIdProvider()
  }

  const client = MqttClient.connect(options)
  return client
}

function _validateProtocol(opts: ConnectOptions): Error | undefined {
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

  // if the protocol provided in the options does not exist in the supported protocols...
  _ensureBrowserUsesSecureProtocol((opts.brokerUrl as URL).protocol)
  return
}

function formatSecureProtocolError(protocol: string): Error {
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

function _ensureBrowserUsesSecureProtocol(protocol: string): string {
  let browserCompatibleProtocol: string = ''
  // TODO: This used to be if (isBrowser) but I'm removing isBrowser. We should 
  // just shim this.
  if (false) {
    if (protocol === 'mqtt') {
      browserCompatibleProtocol = 'ws'
    } else if (protocol === 'mqtts') {
      browserCompatibleProtocol = 'wss'
    }
  }
  return browserCompatibleProtocol || protocol
}

export {connect, DefaultMessageIdProvider, UniqueMessageIdProvider}
