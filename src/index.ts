/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */

import { MqttClient } from './client.js';
import { ConnectOptions } from './interface/connectOptions.js';
import { protocols } from './util/constants.js';
import { logger } from './util/logger.js';

import { URL } from 'node:url';
import { ClientOptions, generateDefaultClientOptions } from './interface/clientOptions.js';

/**
 * connect()
 * Connect will:
 *   1) Validate the options provided by the user.
 *   2) Instantiate a new client.
 *   3) Return the client to the user.
 */
async function connect(options: ConnectOptions) {
  logger.info(`validating options...`);
  if (options.clean === false && typeof options.clientId === undefined) {
    throw new Error('Client ID must be specified when cleanSession is false');
  }
  const mergedOptions: ClientOptions = {
    ...generateDefaultClientOptions(),
    ...options
  }
  if (mergedOptions.clean === false) {
    throw new Error('connecting with an existing session is not yet supported')
  }
  if (mergedOptions.protocolVersion === 5) {
    throw new Error('Protocol version 5 is not yet supported');
  }
  if (mergedOptions.protocolVersion !== 4 && mergedOptions.protocolVersion !== 5) {
    throw new Error('Invalid protocol version specified');
  }
  if (typeof mergedOptions.brokerUrl === 'string') {
    mergedOptions.brokerUrl = new URL(mergedOptions.brokerUrl);
  }
  if (!['mqtt:', 'mqtts:'].includes(mergedOptions.brokerUrl.protocol)) {
    throw new Error('Invalid protocol. Only mqtt and mqtts are supported');
  }
  if (mergedOptions.brokerUrl.port === '') {
    mergedOptions.brokerUrl.port = mergedOptions.brokerUrl.protocol === 'mqtt:' ? '1883' : '8883';
  }

  const validationErr: Error | undefined = _validateProtocol(mergedOptions);
  if (validationErr) {
    throw validationErr;
  }

  logger.trace('creating new client...');
  const client = new MqttClient(mergedOptions);
  const connackPacket = await client.connect();
  logger.trace(`connack packet: ${JSON.stringify(connackPacket)}`);
  logger.trace('returning client...');
  return client;
}

function _validateProtocol(opts: ClientOptions): Error | undefined {
  logger.info(`validating protocol options...`);
  if (opts.tlsOptions && 'cert' in opts.tlsOptions && 'key' in opts.tlsOptions) {
    const urlProtocol = (opts.brokerUrl as URL).protocol;
    if (urlProtocol) {
      if (protocols.secure.indexOf(urlProtocol) === -1) {
        const protocolError: Error = formatSecureProtocolError(urlProtocol);
        return protocolError;
      }
    } else {
      // A cert and key was provided, however no protocol was specified, so we will throw an error.
      // TODO: Git Blame on this line. I don't understand the error message at all.
      return new Error('Missing secure protocol key');
    }
  }
  return undefined;
}

function formatSecureProtocolError(protocol: string): Error {
  logger.info('secure protocol error! formatting secure protocol error... ');
  let secureProtocol: string;
  switch (protocol) {
    case 'mqtt':
      secureProtocol = 'mqtts';
      break;
    case 'ws':
      secureProtocol = 'wss';
      break;
    default:
      return new Error('Unknown protocol for secure connection: "' + protocol + '"!');
  }
  return new Error(
    `user provided cert and key , but protocol ${protocol} is insecure. 
    Use ${secureProtocol} instead.`
  );
}

export { connect };
