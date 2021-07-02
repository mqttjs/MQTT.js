'use strict'
var {createQuicSocket} = require('net')
var debug = require('debug')('mqttjs:quic')

function buildBuilder(mqttClient, opts) {
  
    opts.port = opts.port || 8885
    opts.host = opts.hostname || opts.host || 'localhost'
    opts.servername = opts.host

    opts.rejectUnauthorized = opts.rejectUnauthorized !== false

    delete opts.path

    debug('port %d host %s rejectUnauthorized %b', opts.port, opts.host, opts.rejectUnauthorized)

    const socket = createQuicSocket({
        client: {
            alpn: opts.alpn || 'mqtt',
        }
    })

    const req = socket.connect({
        address: opts.host,
        port: opts.port || 8885,
        cert: opts.cert,
        key: opts.key,
        idleTimeout:0 //disable timeout
    })

    var stream = req.openStream()
    
    req.on('secure', function (servername) {
        // servername is checked for any string for authorisation acceptance
        if (opts.rejectUnauthorized && !servername) {
            req.emit('error', new Error('TLS not authorized'))
        } else {
            req.removeListener('error', handleTLSErrors)
        }
    })

    function handleTLSErrors(err) {
        
        if (opts.rejectUnauthorized) {
            mqttClient.emit('error', err)
        }

        stream.end()
        socket.close()
    }

    req.on('error', handleTLSErrors)
    return stream
}

module.exports = buildBuilder
