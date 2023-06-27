'use strict'

const Transform = require('readable-stream').Transform
const duplexify = require('duplexify')

/* global FileReader */
let my
let proxy
let stream
let isInitialized = false

function buildProxy () {
  const proxy = new Transform()
  proxy._write = function (chunk, encoding, next) {
    my.sendSocketMessage({
      data: chunk.buffer,
      success: function () {
        next()
      },
      fail: function () {
        next(new Error())
      }
    })
  }
  proxy._flush = function socketEnd (done) {
    my.closeSocket({
      success: function () {
        done()
      }
    })
  }

  return proxy
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

function buildUrl (opts, client) {
  const protocol = opts.protocol === 'alis' ? 'wss' : 'ws'
  let url = protocol + '://' + opts.hostname + opts.path
  if (opts.port && opts.port !== 80 && opts.port !== 443) {
    url = protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  }
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function bindEventHandler () {
  if (isInitialized) return

  isInitialized = true

  my.onSocketOpen(function () {
    stream.setReadable(proxy)
    stream.setWritable(proxy)
    stream.emit('connect')
  })

  my.onSocketMessage(function (res) {
    if (typeof res.data === 'string') {
      const buffer = Buffer.from(res.data, 'base64')
      proxy.push(buffer)
    } else {
      const reader = new FileReader()
      reader.addEventListener('load', function () {
        let data = reader.result

        if (data instanceof ArrayBuffer) data = Buffer.from(data)
        else data = Buffer.from(data, 'utf8')
        proxy.push(data)
      })
      reader.readAsArrayBuffer(res.data)
    }
  })

  my.onSocketClose(function () {
    stream.end()
    stream.destroy()
  })

  my.onSocketError(function (res) {
    stream.destroy(res)
  })
}

function buildStream (client, opts) {
  opts.hostname = opts.hostname || opts.host

  if (!opts.hostname) {
    throw new Error('Could not determine host. Specify host manually.')
  }

  const websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

  setDefaultOpts(opts)

  const url = buildUrl(opts, client)
  my = opts.my
  my.connectSocket({
    url: url,
    protocols: websocketSubProtocol
  })

  proxy = buildProxy()
  stream = duplexify.obj()

  bindEventHandler()

  return stream
}

module.exports = buildStream
