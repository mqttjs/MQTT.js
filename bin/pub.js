#!/usr/bin/env node

var mqtt      = require('../')
  , path      = require('path')
  , fs        = require('fs')
  , concat    = require('concat-stream')
  , helpMe    = require('help-me')({
      dir: path.join(__dirname, '..', 'doc')
    })
  , minimist  = require('minimist');

function send(args) {
  var client = mqtt.connect(args);
  client.on('connect', function() {
    client.publish(args.topic, args.message, args);
    client.end();
  });
}

function start(args) {
  args = minimist(args, {
    string: ['hostname', 'username', 'password', 'key', 'cert'],
    integer: ['port', 'qos'],
    boolean: ['stdin', 'retain', 'help', 'insecure'],
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
      protocol: 'C',
      help: 'H'
    },
    default: {
      host: 'localhost',
      qos: 0,
      retain: false
    }
  });

  if (args.help) {
    return helpMe.toStdout('publish');
  }

  args.topic = args.topic || args._.shift();
  args.message = args.message || args._.shift() || '';

  if (!args.topic) {
    console.error('missing topic\n');
    return helpMe.toStdout('publish');
  }

  if (args.key) {
    args.key = fs.readFileSync(key);
  }

  if (args.cert) {
    args.cert = fs.readFileSync(cert);
  }

  if (args.ca) {
    args.ca = fs.readFileSync(args.ca);
  }

  if (args.key && args.cert && !args.protocol) {
    args.protocol = 'mqtts'
  }

  if (args['will-topic']) {
    args.will = {};
    args.will.topic = args['will-topic'];
    args.will.payload = args['will-message'];
    args.will.qos = args['will-qos'];
    args.will.retain = args['will-retain'];
  }

  if (args.insecure) {
    args.rejectUnauthorized = false;
  }

  if (args.insecure) {
    args.rejectUnauthorized = false;
  }

  if (args.stdin) {
    process.stdin.pipe(concat(function(data) {
      args.message = data.toString().trim();
      send(args);
    }));
  } else {
    send(args);
  }
}

module.exports = start;

if (require.main === module) {
  start(process.argv.slice(2))
}
