/* eslint-disable import/no-extraneous-dependencies */
const commonjs = require('@rollup/plugin-commonjs')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const polyfills = require('rollup-plugin-polyfill-node')
const replace = require('@rollup/plugin-replace')
const fs = require('fs')

// patch mqtt packet parser
const mqttPacketParsePath = './node_modules/mqtt-packet/parser.js'
const mqttPacketParseContent = fs.readFileSync(mqttPacketParsePath, 'utf8')
const modifiedMqttPacketParseContent = mqttPacketParseContent.replace(
	"const EventEmitter = require('events')",
	"const {EventEmitter} = require('events')",
)
fs.writeFileSync(mqttPacketParsePath, modifiedMqttPacketParseContent, 'utf8')

module.exports = {
	input: './lib/connect/index.js',
	// input: './mqtt.js',
	output: {
		format: 'umd',
		file: 'dist/mqtt.js',
		name: 'mqtt',
		globals: {
			'readable-stream': 'stream',
		},
		exports: 'named',
	},
	plugins: [
		nodeResolve({
			preferBuiltins: true,
			browser: true,
			mainFields: ['module', 'main', 'browser'],
		}),
		replace({
			preventAssignment: true,
			values: {
				"require('readable-stream')": "require('stream')",
			},
		}),
		commonjs({
			transformMixedEsModules: true,
		}),
		polyfills(),
	],
	external: ['readable-stream'],
	context: 'window',
}
