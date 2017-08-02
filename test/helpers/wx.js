var global = require('global')

var socket
global.wx = {
  connectSocket: function (opts) {
    if (!socket) {
      socket = new global.WebSocket(opts.url, opts.protocols)
      socket.binaryType = 'arraybuffer'
    }
  },
  onSocketOpen: function (callback) {
    socket.onopen = callback
  },
  onSocketMessage: function (callback) {
    socket.onmessage = callback
  },
  onSocketClose: function (callback) {
    socket.onclose = callback
  },
  onSocketError: function (callback) {
    socket.onerror = callback
  },
  sendSocketMessage: function (p) {
    socket.send(p.data)
  },
  closeSocket: function () {
  }
}
