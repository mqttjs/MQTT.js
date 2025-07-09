/* eslint-disable @typescript-eslint/no-var-requires */
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

let protocols: Record<string, StreamBuilder> | undefined

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
function parseAuthOptions(opts: IClientOptions) {
	if (opts.auth === undefined) {
		return
	}

	const results: RegExpExecArray | null =
		/^(?<username>.+):(?<password>.+)$/.exec(opts.auth)

	if (
		results?.groups?.['username'] !== undefined &&
		results?.groups?.['password'] !== undefined
	) {
		opts.username = results.groups['username']
		opts.password = results.groups['password']
	} else {
		opts.username = opts.auth
	}
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
	// @robertsLando: This is a dangerous evaluation of brokerUrl as typeof null === 'object' will return true
	if (typeof brokerUrl === 'object' && opts === undefined) {
		opts = brokerUrl
		brokerUrl = ''
	}

	opts = opts ?? {}

	// try to parse the broker url
	if (brokerUrl && typeof brokerUrl === 'string') {
		// eslint-disable-next-line
		const parsedUrl = url.parse(brokerUrl, true)
		const parsedOptions: IClientOptions = {}

		if (parsedUrl.port !== null) {
			parsedOptions.port = parseInt(parsedUrl.port, 10)
		}

		if (parsedUrl.hostname !== null) {
			parsedOptions.host = parsedUrl.hostname
		}

		// @ts-expect-error - This needs to be narrowed using a type guard as we can end up with unexpected record entries.
		parsedOptions.query = parsedUrl.query

		if (parsedUrl.auth !== null) {
			parsedOptions.auth = parsedUrl.auth
		}

		// @ts-expect-error - We need to create a typeguard to ensure a valid mqtt protocol
		parsedOptions.protocol = parsedUrl.protocol

		if (parsedUrl.path !== null) {
			parsedOptions.path = parsedUrl.path
		}

		opts = { ...parsedOptions, ...opts }

		// when parsing an url expect the protocol to be set
		if (!opts.protocol) {
			throw new Error('Missing protocol')
		}

		// @ts-expect-error - We need to create a typeguard to ensure a valid mqtt protocol
		opts.protocol = opts.protocol.replace(/:$/, '')
	}

	// @ts-expect-error - We need to determine what to do by default here. The most likely case is to default to false.
	opts.unixSocket = opts.unixSocket ?? opts.protocol?.includes('+unix')

	if (opts.unixSocket) {
		// @ts-expect-error - We need to create a typeguard to ensure a valid mqtt protocol
		opts.protocol = opts.protocol?.replace('+unix', '')
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
	if (opts.query && typeof opts.query['clientId'] === 'string') {
		opts.clientId = opts.query['clientId']
	}

	if (isBrowser || opts.unixSocket) {
		delete opts.socksProxy
	} else if (opts.socksProxy === undefined && process === undefined) {
		// @ts-expect-error - process is considered as type never because this code does not import the Node lib which results in process being forbidden.
		opts.socksProxy = process.env['MQTTJS_SOCKS_PROXY']
	}

	if (opts.cert && opts.key) {
		if (opts.protocol) {
			if (['mqtts', 'wss', 'wxs', 'alis'].indexOf(opts.protocol) === -1) {
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

	// only loads the protocols once
	// @TODO: This is very heavy on the runtime, especially when working with CJS, as you may be living in a cache-busted environment which will result in significant IOPS because of the repeated require()
	// Consider either migrating to ESM, which is immutable and thus immune to cache busting, or simply requiring each file once.
	// Note: Those situations are very rare, but considering how widespread MQTT is within the IoT world, it might be worth considering
	if (protocols === undefined) {
		protocols = {}
		if (!isBrowser && !opts.forceNativeWebSocket) {
			protocols['ws'] = require('./ws').streamBuilder
			protocols['wss'] = require('./ws').streamBuilder

			protocols['mqtt'] = require('./tcp').default
			protocols['tcp'] = require('./tcp').default

			const tlsDefault: StreamBuilder = require('./tls.js').default

			protocols['ssl'] = tlsDefault
			protocols['tls'] = tlsDefault
			protocols['mqtts'] = tlsDefault
			// This case triggers if we are not in browser environment, yet we use require() which definitely constrains end-users to use a bundler as require is a Node.js only syntax.
			// switching to dynamic await import()
		} else {
			protocols['ws'] = require('./ws').browserStreamBuilder
			protocols['wss'] = require('./ws').browserStreamBuilder

			protocols['wx'] = require('./wx').default
			protocols['wxs'] = require('./wx').default

			protocols['ali'] = require('./ali').default
			protocols['alis'] = require('./ali').default
		}
	}

	if (opts.protocol !== undefined && protocols[opts.protocol]) {
		const isSecure = ['mqtts', 'wss'].indexOf(opts.protocol) !== -1
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
		].filter((key, index) => {
			if (isSecure && index % 2 === 0) {
				// Skip insecure protocols when requesting a secure one.
				return false
			}
			// @ts-expect-error - Because this is called within a callback and not within the top level code, TypeScript complains about a possible race condition.
			return typeof protocols[key] === 'function'
		})[0] as MqttProtocol
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
			opts.protocol = !opts.servers[client._reconnectCount].protocol
				? opts.defaultProtocol
				: opts.servers[client._reconnectCount].protocol
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
			connect: () => {
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
				// @ts-expect-error - For now we can accept this error, however TypeScript is right here despite the prior assignation, due to how the event loop functions and the possibility of race condition.
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
					// @ts-expect-error - Object.keys() does not return a keyof OriginalObject. This is a normal TypeScript behaviour due to possible inheritance or prototype hijacking.
					promiseResolutionListeners[eventName],
				)
			})
		}

		// Add listeners to client
		Object.keys(promiseResolutionListeners).forEach((eventName) => {
			client.on(
				eventName as keyof MqttClientEventCallbacks,
				// @ts-expect-error - Object.keys() does not return a keyof OriginalObject. This is a normal TypeScript behaviour due to possible inheritance or prototype hijacking.
				promiseResolutionListeners[eventName],
			)
		})
	})
}

export default connect
export { connectAsync }
