'use strict'

/* global FileReader Blob */
var my
var socketOpen = false
var socketMsgQueue = []

function sendSocketMessage (msg) {
  if (socketOpen) {
    my.sendSocketMessage({
      data: msg.buffer || msg
    })
  } else {
    socketMsgQueue.push(msg)
  }
}

function WebSocket (url, protocols) {
  var ws = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    readyState: socketOpen ? 1 : 0,
    send: sendSocketMessage,
    close: function closeSocket () {
      my.closeSocket(function () {
        ws.readyState = ws.CLOSED
      })
    },
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null
  }

  my.connectSocket({
    url: url,
    protocols: protocols
  })
  my.onSocketOpen(function () {
    ws.readyState = ws.OPEN
    socketOpen = true
    for (var i = 0; i < socketMsgQueue.length; i++) {
      sendSocketMessage(socketMsgQueue[i])
    }
    socketMsgQueue = []

    ws.onopen && ws.onopen.apply(ws, arguments)
  })
  my.onSocketMessage(function (res) {
    if (res.data instanceof Blob) {
      var fr = new FileReader()
      fr.addEventListener('load', function () {
        ws.onmessage && ws.onmessage({ data: fr.result })
      })
      fr.readAsArrayBuffer(res.data)
    } else {
      ws.onmessage && ws.onmessage.apply(ws, arguments)
    }
  })
  my.onSocketClose(function () {
    ws.onclose && ws.onclose.apply(ws, arguments)
    ws.readyState = ws.CLOSED
    socketOpen = false
  })
  my.onSocketError(function () {
    ws.onerror && ws.onerror.apply(ws, arguments)
    ws.readyState = ws.CLOSED
    socketOpen = false
  })

  return ws
}

var websocket = require('websocket-stream')

function buildUrl (opts, client) {
  var protocol = opts.protocol === 'wxs' ? 'wss' : 'ws'
  var url = protocol + '://' + opts.hostname + opts.path
  if (opts.port && opts.port !== 80 && opts.port !== 443) {
    url = protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  }
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function setDefaultOpts (opts) {
  if (!opts.hostname) {
    opts.hostname = 'localhost'
  }
  if (!opts.path) {
    opts.path = '/'
  }

  if (!opts.wsOptions) {
    opts.wsOptions = {}
  }
}

function createWebSocket (client, opts) {
  var websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

  setDefaultOpts(opts)
  var url = buildUrl(opts, client)
  my = opts.my
  return websocket(WebSocket(url, [websocketSubProtocol]))
}

function buildBuilder (client, opts) {
  opts.hostname = opts.hostname || opts.host

  if (!opts.hostname) {
    throw new Error('Could not determine host. Specify host manually.')
  }

  return createWebSocket(client, opts)
}

module.exports = buildBuilder
