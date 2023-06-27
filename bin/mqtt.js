#!/usr/bin/env node
'use strict'

/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */
const path = require('path')
const commist = require('commist')()
const helpMe = require('help-me')({
  dir: path.join(path.dirname(require.main.filename), '/../doc'),
  ext: '.txt'
})

commist.register('publish', require('./pub'))
commist.register('subscribe', require('./sub'))
commist.register('version', function () {
  console.log('MQTT.js version:', require('./../package.json').version)
})
commist.register('help', helpMe.toStdout)

if (commist.parse(process.argv.slice(2)) !== null) {
  console.log('No such command:', process.argv[2], '\n')
  helpMe.toStdout()
}
