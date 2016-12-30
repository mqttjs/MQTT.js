#!/usr/bin/env node

'use strict'

var mqtt = require('../')
var pump = require('pump')
var path = require('path')
var fs = require('fs')
var concat = require('concat-stream')
var Writable = require('readable-stream').Writable
var helpMe = require('help-me')({
  dir: path.join(__dirname, '..', 'doc')
})
var minimist = require('minimist')
var split2 = require('split2')

function send (args) {
  var client = mqtt.connect(args)
  client.on('connect', function () {
    client.publish(args.topic, args.message, args, function (err) {
      if (err) {
        console.warn(err)
      }
      client.end()
    })
  })
  client.on('error', function (err) {
    console.warn(err)
    client.end()
  })
}

function multisend (args) {
  var client = mqtt.connect(args)
  var sender = new Writable({
    objectMode: true
  })
  sender._write = function (line, enc, cb) {
    client.publish(args.topic, line.trim(), args, cb)
  }

  client.on('connect', function () {
    pump(process.stdin, split2(), sender, function (err) {
      client.end()
      if (err) {
        throw err
      }
    })
  })
}

function start (args) {
  args = minimist(args, {
    string: ['hostname', 'username', 'password', 'key', 'cert', 'ca', 'message', 'clientId', 'i', 'id'],
    boolean: ['stdin', 'retain', 'help', 'insecure', 'multiline'],
    alias: {
      port: 'p',
      hostname: ['h', 'host'],
      topic: 't',
      message: 'm',
      qos: 'q',
      clientId: ['i', 'id'],
      retain: 'r',
      username: 'u',
      password: 'P',
      stdin: 's',
      multiline: 'M',
      protocol: ['C', 'l'],
      help: 'H',
      ca: 'cafile'
    },
    default: {
      host: 'localhost',
      qos: 0,
      retain: false,
      topic: '',
      message: ''
    }
  })

  if (args.help) {
    return helpMe.toStdout('publish')
  }

  if (args.key) {
    args.key = fs.readFileSync(args.key)
  }

  if (args.cert) {
    args.cert = fs.readFileSync(args.cert)
  }

  if (args.ca) {
    args.ca = fs.readFileSync(args.ca)
  }

  if (args.key && args.cert && !args.protocol) {
    args.protocol = 'mqtts'
  }

  if (args.port) {
    if (typeof args.port !== 'number') {
      console.warn('# Port: number expected, \'%s\' was given.', typeof args.port)
      return
    }
  }

  if (args['will-topic']) {
    args.will = {}
    args.will.topic = args['will-topic']
    args.will.payload = args['will-message']
    args.will.qos = args['will-qos']
    args.will.retain = args['will-retain']
  }

  if (args.insecure) {
    args.rejectUnauthorized = false
  }

  args.topic = (args.topic || args._.shift()).toString()
  args.message = (args.message || args._.shift()).toString()

  if (!args.topic) {
    console.error('missing topic\n')
    return helpMe.toStdout('publish')
  }

  if (args.stdin) {
    if (args.multiline) {
      multisend(args)
    } else {
      process.stdin.pipe(concat(function (data) {
        args.message = data.toString().trim()
        send(args)
      }))
    }
  } else {
    send(args)
  }
}

module.exports = start

if (require.main === module) {
  start(process.argv.slice(2))
}
