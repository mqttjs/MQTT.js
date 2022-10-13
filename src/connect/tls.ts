'use strict';
import tls from 'tls';
import net from 'net';
import debugModule from 'debug';
import { MqttClient } from '../client';
import { IClientOptions } from '../client-options';
import { _IDuplex } from 'readable-stream';
const debug = debugModule('mqttjs:tls');

function buildBuilder(mqttClient: MqttClient, opts: IClientOptions): _IDuplex {
  opts.port = opts.port || 8883;
  opts.host = opts.hostname || opts.host || 'localhost';

  if (net.isIP(opts.host) === 0) {
    (opts as any).servername = opts.host; // TODO: opts needs a different type because it's being passed to tls.connect
  }

  opts.rejectUnauthorized = opts.rejectUnauthorized !== false;

  delete opts.path;

  debug('port %d host %s rejectUnauthorized %b', opts.port, opts.host, opts.rejectUnauthorized);

  const connection = tls.connect(opts);
  /* eslint no-use-before-define: [2, "nofunc"] */
  connection.on('secureConnect', function () {
    if (opts.rejectUnauthorized && !connection.authorized) {
      connection.emit('error', new Error('TLS not authorized'));
    } else {
      connection.removeListener('error', handleTLSerrors);
    }
  });

  function handleTLSerrors(err?: Error): void {
    // How can I get verify this error is a tls error?
    if (opts.rejectUnauthorized) {
      mqttClient.emit('error', err);
    }

    // close this connection to match the behaviour of net
    // otherwise all we get is an error from the connection
    // and close event doesn't fire. This is a work around
    // to enable the reconnect code to work the same as with
    // net.createConnection
    connection.end();
  }

  connection.on('error', handleTLSerrors);
  return connection as unknown as _IDuplex;
}

module.exports = buildBuilder;
