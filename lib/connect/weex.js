'use strict'

var socketOpen = false
var socketMsgQueue = []

// https://weex.apache.org/ a framework for building mobile cross-platform UIs
var weexws = weex.requireModule('webSocket') // eslint-disable-line

function sendSocketMessage (msg) {
  if (socketOpen) {
    weexws.send(msg)
  } else {
    socketMsgQueue.push(msg)
  }
}

function WebSocket (url, protocols) {
  var ws = {
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    readyState: socketOpen ? 1 : 0,
    send: sendSocketMessage,
    close: weexws.close,
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    set onmessage(func) {
      this._onmessage = func
    },
    get onmessage() {
      return this._onmessage
    }
  }

  weexws.WebSocket(url, protocols)

  weexws.onopen = function (res) {
    ws.readyState = ws.OPEN
    socketOpen = true
    for (var i = 0; i < socketMsgQueue.length; i++) {
      sendSocketMessage(socketMsgQueue[i])
    }
    socketMsgQueue = []

    ws.onopen && ws.onopen.apply(ws, arguments)
  }

  weexws.onmessage = function (res) {
    // Blob is the only supported type of recieve data in weex, transfer to ArrayBuffer
    var fr = new FileReader();
    fr.onload = function(){
      var data = this.result;
      ws._onmessage && ws._onmessage.apply(ws, [Object.assign({}, res, { data: data })])
    }
    fr.readAsArrayBuffer(res.data);
  }

  weexws.onclose = function () {
    ws.onclose && ws.onclose.apply(ws, arguments)
    ws.readyState = ws.CLOSED
    socketOpen = false
  }

  weexws.onerror = function () {
    ws.onerror && ws.onerror.apply(ws, arguments)
    ws.readyState = ws.CLOSED
    socketOpen = false
  }

  return ws
}

var websocket = require('websocket-stream')
var urlModule = require('url')

function buildUrl (opts, client) {
  var protocol = opts.protocol === 'wxs' ? 'wss' : 'ws'
  var url = protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function setDefaultOpts (opts) {
  if (!opts.hostname) {
    opts.hostname = 'localhost'
  }
  if (!opts.port) {
    if (opts.protocol === 'wss') {
      opts.port = 443
    } else {
      opts.port = 80
    }
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
  return websocket(WebSocket(url, [websocketSubProtocol]))
}

function buildBuilder (client, opts) {
  if (!opts.hostname) {
    opts.hostname = opts.host
  }

  if (!opts.hostname) {
    // Throwing an error in a Web Worker if no `hostname` is given, because we
    // can not determine the `hostname` automatically.  If connecting to
    // localhost, please supply the `hostname` as an argument.
    if (typeof (document) === 'undefined') {
      throw new Error('Could not determine host. Specify host manually.')
    }
    var parsed = urlModule.parse(document.URL)
    opts.hostname = parsed.hostname

    if (!opts.port) {
      opts.port = parsed.port
    }
  }
  return createWebSocket(client, opts)
}

module.exports = buildBuilder