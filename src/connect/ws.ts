'use strict';

import { Buffer } from 'buffer';
import { MqttClient } from '../client';
import { IClientOptions } from '../client-options';

import WebSocket from 'ws';
import debugModule from 'debug';
import duplexify from 'duplexify';
import { _IDuplex, Duplex, Transform } from 'readable-stream';

const debug = debugModule('mqttjs:ws');

// eslint-disable-next-line camelcase
declare const __webpack_require__: any;

const WSS_OPTIONS = ['rejectUnauthorized', 'ca', 'cert', 'key', 'pfx', 'passphrase'];
// eslint-disable-next-line camelcase
const IS_BROWSER = (typeof process !== 'undefined' && process.title === 'browser') || typeof __webpack_require__ === 'function';

function buildUrl(opts: IClientOptions, client: MqttClient): string {
  let url = opts.protocol + '://' + opts.hostname + ':' + opts.port + opts.path;
  if (typeof opts.transformWsUrl === 'function') {
    url = opts.transformWsUrl(url, opts, client);
  }
  return url;
}

function setDefaultOpts(opts: IClientOptions): IClientOptions {
  const options = opts; // TODO: I think this line does not do what you think it does. Why alias it here?
  if (!opts.hostname) {
    options.hostname = 'localhost';
  }
  if (!opts.port) {
    if (opts.protocol === 'wss') {
      options.port = 443;
    } else {
      options.port = 80;
    }
  }
  if (!opts.path) {
    options.path = '/';
  }

  if (!opts.wsOptions) {
    options.wsOptions = {};
  }
  if (!IS_BROWSER && opts.protocol === 'wss') {
    // Add cert/key/ca etc options
    WSS_OPTIONS.forEach(function (prop) {
      if (Object.prototype.hasOwnProperty.call(opts, prop) && !Object.prototype.hasOwnProperty.call(opts.wsOptions, prop)) {
        (options.wsOptions as any)[prop] = (opts as any)[prop];
      }
    });
  }

  return options;
}

function setDefaultBrowserOpts(opts: IClientOptions): IClientOptions {
  const options: IClientOptions = setDefaultOpts(opts);

  if (!options.hostname) {
    options.hostname = options.host;
  }

  if (!options.hostname) {
    // Throwing an error in a Web Worker if no `hostname` is given, because we
    // can not determine the `hostname` automatically.  If connecting to
    // localhost, please supply the `hostname` as an argument.
    if (typeof document === 'undefined') {
      throw new Error('Could not determine host. Specify host manually.');
    }
    const parsed = new URL(document.URL);
    options.hostname = parsed.hostname;

    if (!options.port) {
      options.port = Number(parsed.port);
    }
  }

  // objectMode should be defined for logic
  // TODO: maybe this should be webSocketObjectMode?
  if (options.objectMode == undefined) {
    options.objectMode = !(options.binary === true || options.binary == undefined);
  }

  return options;
}

function createWebSocket(_client: MqttClient, url: string, opts: IClientOptions): WebSocket {
  debug('createWebSocket');
  debug('protocol: ' + opts.protocolId + ' ' + opts.protocolVersion);
  const websocketSubProtocol = opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3 ? 'mqttv3.1' : 'mqtt';

  debug('creating new Websocket for url: ' + url + ' and protocol: ' + websocketSubProtocol);
  const socket = new WebSocket(url, [websocketSubProtocol], opts.wsOptions as any);
  return socket;
}

function createBrowserWebSocket(client: MqttClient, opts: IClientOptions): WebSocket {
  const websocketSubProtocol = opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3 ? 'mqttv3.1' : 'mqtt';

  const url = buildUrl(opts, client);
  const socket = new WebSocket(url, [websocketSubProtocol]);
  socket.binaryType = 'arraybuffer';
  return socket;
}

function streamBuilder(client: MqttClient, opts: IClientOptions): _IDuplex {
  debug('streamBuilder');
  const options = setDefaultOpts(opts);
  const url = buildUrl(options, client);
  const socket = createWebSocket(client, url, options);
  const webSocketStream = WebSocket.createWebSocketStream(socket, options.wsOptions as any);
  (webSocketStream as any).url = url;
  socket.on('close', () => {
    webSocketStream.destroy();
  });
  return webSocketStream as unknown as _IDuplex;
}

function browserStreamBuilder(client: MqttClient, opts: IClientOptions): Duplex {
  debug('browserStreamBuilder');
  let stream: Transform | duplexify.Duplexify;
  const options = setDefaultBrowserOpts(opts);
  // sets the maximum socket buffer size before throttling
  const bufferSize = options.browserBufferSize || 1024 * 512;

  const bufferTimeout = opts.browserBufferTimeout || 1000;

  const coerceToBuffer = !opts.objectMode;

  const socket = createBrowserWebSocket(client, opts);

  const proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser);

  if (!opts.objectMode) {
    proxy._writev = writev;
  }
  proxy.on('close', () => {
    socket.close();
  });

  const eventListenerSupport = typeof socket.addEventListener !== 'undefined';

  // was already open when passed in
  if (socket.readyState === socket.OPEN) {
    stream = proxy;
  } else {
    stream = duplexify(undefined, undefined, opts);
    if (!opts.objectMode) {
      stream._writev = writev;
    }

    if (eventListenerSupport) {
      socket.addEventListener('open', onopen);
    } else {
      socket.onopen = onopen;
    }
  }

  // TODO: this code is very unsafe because of the weird type(stream) value. Should it be 2 functions?
  (stream as any).socket = socket;

  if (eventListenerSupport) {
    socket.addEventListener('close', onclose);
    socket.addEventListener('error', onerror);
    socket.addEventListener('message', onmessage);
  } else {
    socket.onclose = onclose;
    socket.onerror = onerror;
    socket.onmessage = onmessage;
  }

  // methods for browserStreamBuilder

  function buildProxy(
    options: IClientOptions,
    socketWrite: (chunk: any, encoding: string, callback: (error?: Error | null) => void) => void,
    socketEnd: (callback: (err?: Error | null | undefined, data?: any) => void) => void
  ): Transform {
    const proxy = new Transform({
      objectMode: options.objectMode,
    });

    proxy._write = socketWrite;
    proxy._flush = socketEnd;

    return proxy;
  }

  function onopen(): void {
    (stream as any).setReadable(proxy);
    (stream as any).setWritable(proxy);
    stream.emit('connect');
  }

  function onclose(): void {
    stream.end();
    stream.destroy();
  }

  function onerror(event: WebSocket.ErrorEvent): void {
    stream.destroy(event.error);
  }

  function onmessage(event: WebSocket.MessageEvent): void {
    let data = event.data;
    if (data instanceof ArrayBuffer) data = Buffer.from(data);
    else data = Buffer.from(data as any, 'utf8');
    proxy.push(data);
  }

  // this is to be enabled only if objectMode is false
  function writev(chunks: any, cb: (err?: any) => void): void {
    const buffers = new Array(chunks.length);
    for (let i = 0; i < chunks.length; i++) {
      if (typeof chunks[i].chunk === 'string') {
        buffers[i] = Buffer.from(chunks[i], 'utf8');
      } else {
        buffers[i] = chunks[i].chunk;
      }
    }

    stream._write(Buffer.concat(buffers), 'binary', cb);
  }

  function socketWriteBrowser(chunk: any, enc: string, next: (err?: Error | null) => void): void {
    if (socket.bufferedAmount > bufferSize) {
      // throttle data until buffered amount is reduced.
      setTimeout(socketWriteBrowser, bufferTimeout, chunk, enc, next);
    }

    if (coerceToBuffer && typeof chunk === 'string') {
      chunk = Buffer.from(chunk, 'utf8');
    }

    try {
      socket.send(chunk);
    } catch (err) {
      return next(err as Error);
    }

    next();
  }

  function socketEndBrowser(done: (err?: Error | null | undefined) => void) {
    socket.close();
    done();
  }

  // end methods for browserStreamBuilder

  return stream as any;
}

if (IS_BROWSER) {
  module.exports = browserStreamBuilder;
} else {
  module.exports = streamBuilder;
}
