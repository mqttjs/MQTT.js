'use strict';
import net from 'net';
import debugModule from 'debug';
import { _IDuplex } from 'readable-stream';
import { MqttClient } from '../client';
import { IClientOptions } from '../client-options';
const debug = debugModule('mqttjs:tcp');

export function streamBuilder(_client: MqttClient, opts: IClientOptions): _IDuplex {
  opts.port = opts.port || 1883;
  opts.hostname = opts.hostname || opts.host || 'localhost';

  const port = opts.port;
  const host = opts.hostname;

  debug('port %d and host %s', port, host);
  return net.createConnection(port, host) as unknown as _IDuplex;
}

// TODO: this is a node artifact
module.exports = streamBuilder;
