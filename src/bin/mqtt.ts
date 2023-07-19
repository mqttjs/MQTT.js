#!/usr/bin/env node

/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */
import path from 'path'
import commist from 'commist'
import helpMe from 'help-me'
import { version } from '../../package.json'
import publish from './pub'
import subscribe from './sub'

helpMe({
	dir: path.join(path.dirname(require.main.filename), '/../doc'),
	ext: '.txt',
})

commist.register('publish', publish)
commist.register('subscribe', subscribe)

commist.register('version', () => {
	console.log('MQTT.js version:', version)
})
commist.register('help', helpMe.toStdout)

if (commist.parse(process.argv.slice(2)) !== null) {
	console.log('No such command:', process.argv[2], '\n')
	helpMe.toStdout()
}
