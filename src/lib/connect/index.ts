/* eslint-disable @typescript-eslint/no-require-imports */
import _debug from 'debug'
import url from 'url'
import MqttClient, {
	type IClientOptions,
	type MqttClientEventCallbacks,
	type MqttProtocol,
} from '../client'
import isBrowser from '../is-browser'
import { type StreamBuilder } from '../shared'

// Handling the process.nextTick is not a function error in react-native applications.
if (typeof process?.nextTick !== 'function') {
	process.nextTick = setImmediate
}

const debug = _debug('mqttjs')

let nodeProtocols: Record<string, StreamBuilder> = null
let browserProtocols: Record<string, StreamBuilder> = null

function loadNodeProtocols(): Record<string, StreamBuilder> {
	if (!nodeProtocols) {
		nodeProtocols = {}
		nodeProtocols.ws = require('./ws').streamBuilder
		nodeProtocols.wss = require('./ws').streamBuilder

		nodeProtocols.mqtt = require('./tcp').default
		nodeProtocols.tcp = require('./tcp').default
		nodeProtocols.ssl = require('./tls').default
		nodeProtocols.tls = nodeProtocols.ssl
		nodeProtocols.mqtts = require('./tls').default
	}
	return nodeProtocols
}

function loadBrowserProtocols(): Record<string, StreamBuilder> {
	if (!browserProtocols) {
		browserProtocols = {}
		browserProtocols.ws = require('./ws').browserStreamBuilder
		browserProtocols.wss = require('./ws').browserStreamBuilder

		browserProtocols.wx = require('./wx').default
		browserProtocols.wxs = require('./wx').default

		browserProtocols.ali = require('./ali').default
		browserProtocols.alis = require('./ali').default
	}
	return browserProtocols
}

// `string[]`: 'tls' is supported but missing from `MqttProtocol`
const SECURE_PROTOCOLS: string[] = ['mqtts', 'tls', 'ssl', 'wss', 'wxs', 'alis']

function getDefaultWebSocketProtocol(): MqttProtocol {
	if (typeof location !== 'undefined') {
		return location.protocol === 'https:' ? 'wss' : 'ws'
	}

	if (typeof document !== 'undefined') {
		return new URL(document.URL).protocol === 'https:' ? 'wss' : 'ws'
	}

	return 'ws'
}

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
function parseAuthOptions(opts: IClientOptions) {
	if (opts.auth) {
		// The user name ends at the first colon (RFC 3986 section 3.2.1), so a
		// password may contain colons. `url.parse` has already decoded `%3A`.
		const separator = opts.auth.indexOf(':')
		if (separator !== -1) {
			opts.username = opts.auth.slice(0, separator)
			opts.password = opts.auth.slice(separator + 1)
		} else {
			opts.username = opts.auth
		}
	}
}

// url.parse() style objects carry the protocol as 'mqtts:'. Lowercase like
// url.parse() does, so 'MQTTS' is not mistaken for an unknown, insecure one.
function stripProtocolColon(protocol: MqttProtocol): MqttProtocol {
	return protocol?.replace(/:$/, '').toLowerCase() as MqttProtocol
}

/**
 * connect - connect to an MQTT broker.
 */
function connect(brokerUrl: string): MqttClient
function connect(opts: IClientOptions): MqttClient
function connect(brokerUrl: string, opts?: IClientOptions): MqttClient
function connect(
	brokerUrl: string | IClientOptions,
	opts?: IClientOptions,
): MqttClient {
	debug('connecting to an MQTT broker...')
	if (typeof brokerUrl === 'object' && !opts) {
		opts = brokerUrl
		brokerUrl = ''
	}

	opts = opts || {}

	// try to parse the broker url
	if (brokerUrl && typeof brokerUrl === 'string') {
		const parsedUrl = url.parse(brokerUrl, true)
		const parsedOptions: Partial<IClientOptions> = {}
		const isRelativeWebSocketUrl =
			!parsedUrl.protocol &&
			!parsedUrl.hostname &&
			parsedUrl.path?.startsWith('/') &&
			(isBrowser || opts.forceNativeWebSocket)

		if (parsedUrl.port != null) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			parsedOptions.port = Number(parsedUrl.port)
		}

		parsedOptions.host = parsedUrl.hostname
		parsedOptions.query = parsedUrl.query as Record<string, string>
		parsedOptions.auth = parsedUrl.auth
		parsedOptions.protocol = parsedUrl.protocol as MqttProtocol
		parsedOptions.path = parsedUrl.path

		opts = { ...parsedOptions, ...opts }

		// when parsing an url expect the protocol to be set
		if (!opts.protocol && !isRelativeWebSocketUrl) {
			throw new Error('Missing protocol')
		}

		opts.protocol = opts.protocol || getDefaultWebSocketProtocol()
	}

	opts.protocol = stripProtocolColon(opts.protocol)

	opts.unixSocket = opts.unixSocket || opts.protocol?.includes('+unix')

	if (opts.unixSocket) {
		opts.protocol = opts.protocol.replace('+unix', '') as MqttProtocol
	} else if (
		!opts.protocol?.startsWith('ws') &&
		!opts.protocol?.startsWith('wx')
	) {
		// consider path only with ws protocol or unix socket
		// url.parse could return path (for example when url ends with a `/`)
		// that could break the connection. See https://github.com/mqttjs/MQTT.js/pull/1874
		delete opts.path
	}

	// merge in the auth options if supplied
	parseAuthOptions(opts)

	// support clientId passed in the query string of the url
	if (opts.query && typeof opts.query.clientId === 'string') {
		opts.clientId = opts.query.clientId
	}

	if (isBrowser || opts.unixSocket) {
		opts.socksProxy = undefined
	} else if (
		opts.socksProxy === undefined &&
		typeof process !== 'undefined'
	) {
		opts.socksProxy = process.env['MQTTJS_SOCKS_PROXY']
	}

	if (opts.cert && opts.key) {
		if (opts.protocol) {
			if (!SECURE_PROTOCOLS.includes(opts.protocol)) {
				switch (opts.protocol) {
					case 'mqtt':
						opts.protocol = 'mqtts'
						break
					case 'ws':
						opts.protocol = 'wss'
						break
					case 'wx':
						opts.protocol = 'wxs'
						break
					case 'ali':
						opts.protocol = 'alis'
						break
					default:
						throw new Error(
							`Unknown protocol for secure connection: "${opts.protocol}"!`,
						)
				}
			}
		} else {
			// A cert and key was provided, however no protocol was specified, so we will throw an error.
			throw new Error('Missing secure protocol key')
		}
	}

	// picked per call so `forceNativeWebSocket` only affects its own client
	const protocols =
		isBrowser || opts.forceNativeWebSocket
			? loadBrowserProtocols()
			: loadNodeProtocols()

	if (!protocols[opts.protocol]) {
		const requested = opts.protocol
		const isSecure = SECURE_PROTOCOLS.includes(requested)
		// returns the first available protocol based on available protocols (that depends on environment)
		// if no protocol is specified this will return mqtt on node and ws on browser
		// if secure it will return mqtts on node and wss on browser
		opts.protocol = [
			'mqtt',
			'mqtts',
			'ws',
			'wss',
			'wx',
			'wxs',
			'ali',
			'alis',
		].filter((key) => {
			if (isSecure && !SECURE_PROTOCOLS.includes(key)) {
				return false
			}
			return typeof protocols[key] === 'function'
		})[0] as MqttProtocol

		if (isSecure && !opts.protocol) {
			throw new Error(
				`No secure transport available for protocol "${requested}"`,
			)
		}
		debug(
			'no transport for %s, falling back to %s',
			requested,
			opts.protocol,
		)
	}

	if (opts.clean === false && !opts.clientId) {
		throw new Error('Missing clientId for unclean clients')
	}

	if (opts.protocol) {
		opts.defaultProtocol = opts.protocol
	}

	function wrapper(client: MqttClient) {
		if (opts.servers) {
			if (
				!client._reconnectCount ||
				client._reconnectCount === opts.servers.length
			) {
				client._reconnectCount = 0
			}

			opts.host = opts.servers[client._reconnectCount].host
			opts.port = opts.servers[client._reconnectCount].port
			opts.path = opts.servers[client._reconnectCount].path
			opts.protocol = !opts.servers[client._reconnectCount].protocol
				? opts.defaultProtocol
				: stripProtocolColon(
						opts.servers[client._reconnectCount].protocol,
					)
			opts.hostname = opts.host

			client._reconnectCount++
		}

		debug('calling streambuilder for', opts.protocol)
		return protocols[opts.protocol](client, opts)
	}
	const client = new MqttClient(wrapper, opts)
	client.on('error', () => {
		/* Automatically set up client error handling */
	})

	return client
}

function connectAsync(brokerUrl: string): Promise<MqttClient>
function connectAsync(opts: IClientOptions): Promise<MqttClient>
function connectAsync(
	brokerUrl: string,
	opts?: IClientOptions,
): Promise<MqttClient>
function connectAsync(
	brokerUrl: string,
	opts: IClientOptions,
	allowRetries: boolean,
): Promise<MqttClient>
function connectAsync(
	brokerUrl: string | IClientOptions,
	opts?: IClientOptions,
	allowRetries = true,
): Promise<MqttClient> {
	return new Promise((resolve, reject) => {
		const client = connect(brokerUrl as string, opts)

		const promiseResolutionListeners: Partial<MqttClientEventCallbacks> = {
			connect: (connack) => {
				removePromiseResolutionListeners()
				resolve(client) // Resolve on connect
			},
			end: () => {
				removePromiseResolutionListeners()
				resolve(client) // Resolve on end
			},
			error: (err) => {
				removePromiseResolutionListeners()
				client.end()
				reject(err) // Reject on error
			},
		}

		// If retries are not allowed, reject on close
		if (allowRetries === false) {
			promiseResolutionListeners.close = () => {
				promiseResolutionListeners.error(
					new Error("Couldn't connect to server"),
				)
			}
		}

		// Remove listeners added to client by this promise
		function removePromiseResolutionListeners() {
			Object.keys(promiseResolutionListeners).forEach((eventName) => {
				client.off(
					eventName as keyof MqttClientEventCallbacks,
					promiseResolutionListeners[eventName],
				)
			})
		}

		// Add listeners to client
		Object.keys(promiseResolutionListeners).forEach((eventName) => {
			client.on(
				eventName as keyof MqttClientEventCallbacks,
				promiseResolutionListeners[eventName],
			)
		})
	})
}

export default connect
export { connectAsync }
