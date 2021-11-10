import { Duplex } from "stream";
import { WebSocketOptions } from "./webSocketOptions";

export function _buildWebSocketStream (opts: WebSocketOptions): Duplex {
  throw new Error('_buildWebSocketStreamBrowser is not implemented.')
  // if (!isBrowser && opts.protocol === 'wss') {

  // }
  // const url = buildUrl(options, client)
  // const websocketSubProtocol =
  // (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
  //   ? 'mqttv3.1'
  //   : 'mqtt'

  // const socket = new WebSocket(url, [websocketSubProtocol], opts.wsOptions)
  // const webSocketStream = createWebSocketStream(socket, options.wsOptions)
  // webSocketStream.url = url
  // socket.on('close', () => { webSocketStream.destroy() })
  // return webSocketStream
}
