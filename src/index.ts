/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */

import { MqttClient } from './client'
import { Store } from './store'
import { DefaultMessageIdProvider } from './default-message-id-provider'
import { UniqueMessageIdProvider } from './unique-message-id-provider'
import { urlToHttpOptions } from 'url'
import { Duplex } from 'stream'
import { TlsOptions } from 'tls'
import { Server } from 'http'
import {Server as HttpsServer} from 'https'

type supportedProtocols = 'mqtt' | 'mqtts' | 'ws' | 'wss'

const protocols = {
  all : [
    'mqtt',
    'mqtts',
    'ws',
    'wss'
  ],
  secure: [
    'mqtts',
    'ws'
  ],
  insecure: [
    'mqtt',
    'wss'
  ]
}

export const isBrowser = (typeof process !== 'undefined' && process.title === 'browser') || typeof __webpack_require__ === 'function'

export type WsOptions = {
  backlog: number,
  clientTracking: boolean,
  handleProtocols: () => unknown,
  host: string,
  maxPayload: number,
  noServer: boolean,
  path: string,
  perMessageDeflate: boolean | {[x: string]: unknown},
  port: number,
  server: Server | HttpsServer,
  skipUTF8Validation: boolean,
  verifyClient: () => unknown
} & {
  [prop: string]: string
}

export interface ConnectOptions {
  brokerUrl: string | URL
  wsOptions: {[key: string]: WsOptions | unknown},
  tlsOptions: {[key: string]: TlsOptions | unknown},
  keepalive: any,
  reschedulePings: any,
  clientId: any,
  protocolId: 'MQIsdp' | 'MQTT',
  protocolVersion: any,
  clean: any,
  reconnectPeriod: any,
  connectTimeout: any,
  username: any,
  password: any,
  incomingStore: any,
  outgoingStore: any,
  queueQoSZero: any,
  customHandleAcks: any,
  properties: {
    sessionExpiryInterval: number,
    receiveMaximum: number,
    maximumPacketSize: number,
    topicAliasMaximum: number,
    requestResponseInformation: boolean,
    requestProblemInformation: boolean,
    userPropertis: any,
    authenticationMethod: string,
    authenticationData: BinaryData // TODO: Should this be something else?
  }
  authPacket: any,
  will: {
    topic: any,
    payload: any,
    qos: number,
    retain: boolean,
    properties: {
      willDelayInterval: number,
      payloadFormatIndicator: boolean,
      messageExpiryInterval: number,
      contentType: string,
      responseTopic: string,
      correlationData: BinaryData // TODO: is this the right type?
      userProperties: any
    }
  }
  transformWsUrl: () => URL,
  resubscribe: boolean,
  messageIdProvider: any
  customStreamFactory: (options) => Duplex
}


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

  if (!options.brokerUrl.protocol) {
    throw new Error(
      `Missing protocol. \
      To provide a protocol, you have two options:\
      - Format the brokerUrl with a protocol, for example: 'mqtt://test.mosquitto.org'.
      - Pass in the protocol via the protocol option.`)
  }

  // If there is a colon at the end of the provided protocol, replace it with 
  options.brokerUrl.protocol = options.brokerUrl.protocol.replace(/:$/, '')
  const validationErr: Error = _validateProtocol(options)
  if (validationErr) {
    throw validationErr
  }
  const client = new MqttClient(options)
  return client
}

function _validateProtocol(opts): Error | undefined {
  if (opts.cert && opts.key) {
    if (opts.protocol) {
      if (protocols.secure.indexOf(opts.protocol) === -1) {
        const protocolError: Error = formatSecureProtocolError(opts.protocol)
        return protocolError
      }
    } else {
      // A cert and key was provided, however no protocol was specified, so we will throw an error.
      // TODO: Git Blame on this line. I don't understand the error message at all.
      return new Error('Missing secure protocol key')
    }
  }

  // if the protocol provided in the options does not exist in the supported protocols...
  _ensureBrowserUsesSecureProtocol(opts.protocol)
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

function _ensureBrowserUsesSecureProtocol(protocol: supportedProtocols): string {
  let browserCompatibleProtocol: string
  if (Client.isBrowser) {
    if (protocol === 'mqtt') {
      browserCompatibleProtocol = 'ws'
    } else if (protocol === 'mqtts') {
      browserCompatibleProtocol = 'wss'
    }
  }
  return browserCompatibleProtocol || protocol
}

export {connect, Store, DefaultMessageIdProvider, UniqueMessageIdProvider}
