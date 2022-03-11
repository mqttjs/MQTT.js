import WS from 'ws';
import { WebSocketOptions } from './interfaces/webSocketOptions.js';
import { WebSocketStream } from './interfaces/webSocketStream.js';

export function buildWebSocketStream(opts: WebSocketOptions): WebSocketStream {
  const socket = new WS.WebSocket(opts.url, [opts.websocketSubProtocol]);
  const webSocketStream: WebSocketStream = WS.createWebSocketStream(socket, opts.wsOptions);
  webSocketStream.url = opts.url;
  socket.on('close', () => {
    webSocketStream.destroy();
  });
  return webSocketStream;
}
