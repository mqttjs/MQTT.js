/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */

import { MqttClient } from './client'
import { DefaultMessageIdProvider } from './defaultMessageIdProvider'
import { UniqueMessageIdProvider } from './unique-message-id-provider'
import { Duplex } from 'stream'
import { TlsOptions } from 'tls'
import { Server } from 'http'
import {Server as HttpsServer} from 'https'
import { isBrowser } from './isBrowser'
import { QoS, UserProperties } from 'mqtt-packet'

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

// TODO:

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

export interface  ConnectOptions {
  cmd: 'connect'
  clientId: string
  protocolVersion?: 4 | 5 | 3
  protocolId?: 'MQTT' | 'MQIsdp'
  clean?: boolean
  keepalive?: number
  username?: string
  password?: Buffer
  will?: {
    topic: string
    payload: Buffer
    qos?: QoS
    retain?: boolean
    properties?: {
      willDelayInterval?: number,
      payloadFormatIndicator?: number,
      messageExpiryInterval?: number,
      contentType?: string,
      responseTopic?: string,
      correlationData?: Buffer,
      userProperties?: UserProperties
    }
  }
  properties?: {
    sessionExpiryInterval?: number,
    receiveMaximum?: number,
    maximumPacketSize?: number,
    topicAliasMaximum?: number,
    requestResponseInformation?: boolean,
    requestProblemInformation?: boolean,
    userProperties?: UserProperties,
    authenticationMethod?: string,
    authenticationData?: Buffer
  }
  brokerUrl: string | URL
  wsOptions: {[key: string]: WsOptions | unknown},
  tlsOptions: {[key: string]: TlsOptions | unknown},
  reschedulePings: any,
  reconnectPeriod: any,
  connectTimeout: any,
  incomingStore: any,
  outgoingStore: any,
  queueQoSZero: any,
  customHandleAcks: any,
  authPacket: any,
  transformWsUrl: () => URL,
  resubscribe: boolean,
  messageIdProvider: any
  customStreamFactory: (options: ConnectOptions) => Duplex
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
  const validationErr: Error | undefined = _validateProtocol(options)
  if (validationErr) {
    throw validationErr
  }
  const client = MqttClient.connect(options)
  return client
}

function _validateProtocol(opts: ConnectOptions): Error | undefined {
  if (opts.tlsOptions.cert && opts.tlsOptions.key) {
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
  if (isBrowser()) {
    if (protocol === 'mqtt') {
      browserCompatibleProtocol = 'ws'
    } else if (protocol === 'mqtts') {
      browserCompatibleProtocol = 'wss'
    }
  }
  return browserCompatibleProtocol || protocol
}

export {connect, DefaultMessageIdProvider, UniqueMessageIdProvider}
