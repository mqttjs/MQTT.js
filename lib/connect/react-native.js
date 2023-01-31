'use strict'

// React Native might not have a process object, so we need to polyfill it
if (typeof process === 'undefined') {
  // eslint-disable-next-line no-global-assign
  process = {}
};

// We need set the value of process.title, which mqtt.js uses to determine if it's running inside a browser
// like environment and thus knows it doesn't have access to NodeJS core modules like net, tls
process.title = 'browser'

// Legitimate polyfill for process.nextTick, necessary for Duplexify, which is used by mqtt-packet
process.nextTick = setImmediate

// Polyfill for Buffer, which is present in NodeJS core, but not in the React Native environment
global.Buffer = global.Buffer || require('safe-buffer').Buffer

// Entry point for a browser like environment
module.exports = require('./index')
