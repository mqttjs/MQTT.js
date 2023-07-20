/**
 * Module dependencies
 */
import { EventEmitter } from 'events'
import TopicAliasRecv from './topic-alias-recv'
import mqttPacket, {
	IAuthPacket,
	IConnackPacket,
	IDisconnectPacket,
	IPacket,
	IPublishPacket,
	ISubscribePacket,
	ISubscription,
	IUnsubscribePacket,
	Packet,
	QoS,
	UserProperties,
	ISubackPacket,
	IConnectPacket,
} from 'mqtt-packet'
import DefaultMessageIdProvider, {
	IMessageIdProvider,
} from './default-message-id-provider'
import { DuplexOptions, Writable } from 'readable-stream'
import reInterval from 'reinterval'
import clone from 'rfdc/default'
import * as validations from './validations'
import debug from 'debug'
import Store from './store'
import handlePacket from './handlers'
import { ClientOptions } from 'ws'
import { ClientRequestArgs } from 'http'
import {
	DoneCallback,
	GenericCallback,
	IStream,
	StreamBuilder,
	VoidCallback,
} from './shared'
import TopicAliasSend from './topic-alias-send'
import { TypedEventEmitter } from './TypedEmitter'

debug('mqttjs:client')

const nextTick = process
	? process.nextTick
	: (callback: () => void) => {
			setTimeout(callback, 0)
	  }

const setImmediate =
	global.setImmediate ||
	((...args: any[]) => {
		const callback = args.shift()
		nextTick(() => {
			callback(...args)
		})
	})

const defaultConnectOptions = {
	keepalive: 60,
	reschedulePings: true,
	protocolId: 'MQTT',
	protocolVersion: 4,
	reconnectPeriod: 1000,
	connectTimeout: 30 * 1000,
	clean: true,
	resubscribe: true,
	writeCache: true,
}

const socketErrors = [
	'ECONNREFUSED',
	'EADDRINUSE',
	'ECONNRESET',
	'ENOTFOUND',
	'ETIMEDOUT',
]

export type MqttProtocol =
	| 'wss'
	| 'ws'
	| 'mqtt'
	| 'mqtts'
	| 'tcp'
	| 'ssl'
	| 'wx'
	| 'wxs'
	| 'ali'
	| 'alis'

export type StorePutCallback = () => void

export interface ISecureClientOptions {
	/**
	 * optional private keys in PEM format
	 */
	key?: string | string[] | Buffer | Buffer[] | any[]
	/**
	 * optional cert chains in PEM format
	 */
	cert?: string | string[] | Buffer | Buffer[]
	/**
	 * Optionally override the trusted CA certificates in PEM format
	 */
	ca?: string | string[] | Buffer | Buffer[]
	rejectUnauthorized?: boolean
	/**
	 * optional alpn's
	 */
	ALPNProtocols?: string[] | Buffer[] | Uint8Array[] | Buffer | Uint8Array
}

export type AckHandler = (
	topic: string,
	message: Buffer,
	packet: any,
	cb: (error?: Error, code?: number) => void,
) => void

export interface IClientOptions extends ISecureClientOptions {
	/** Encoding to use. Example 'binary' */
	encoding?: BufferEncoding
	/** Set browser buffer size. Default to 512KB */
	browserBufferSize?: number
	/** used in ws protocol to set `objectMode` */
	binary?: boolean
	/** Used on ali protocol */
	my?: any
	/** Manually call `connect` after creating client instance */
	manualConnect?: any
	/** Custom auth packet properties */
	authPacket?: Partial<IAuthPacket>
	/** Disable/Enable writeToStream.cacheNumbers */
	writeCache?: boolean

	servername?: string
	defaultProtocol?: MqttProtocol
	/** Support clientId passed in the query string of the url */
	query?: Record<string, string>
	/** Auth string in the format <username>:<password> */
	auth?: string
	/** Custom ack handler */
	customHandleAcks?: AckHandler
	/** Broker port */
	port?: number
	/** Broker host. Does NOT include port */
	host?: string
	/** @deprecated use `host instead */
	hostname?: string
	/** Websocket `path` added as suffix */
	path?: string
	/** The `MqttProtocol` to use */
	protocol?: MqttProtocol

	/** Websocket options */
	wsOptions?: ClientOptions | ClientRequestArgs | DuplexOptions
	/**
	 *  10 seconds, set to 0 to disable
	 */
	keepalive?: number
	/**
	 * 'mqttjs_' + Math.random().toString(16).substr(2, 8)
	 */
	clientId?: string
	/**
	 * 'MQTT'
	 */
	protocolId?: string
	/**
	 * 4
	 */
	protocolVersion?: number
	/**
	 * true, set to false to receive QoS 1 and 2 messages while offline
	 */
	clean?: boolean
	/**
	 * 1000 milliseconds, interval between two reconnections
	 */
	reconnectPeriod?: number
	/**
	 * 30 * 1000 milliseconds, time to wait before a CONNACK is received
	 */
	connectTimeout?: number
	/**
	 * the username required by your broker, if any
	 */
	username?: string
	/**
	 * the password required by your broker, if any
	 */
	password?: Buffer | string
	/**
	 * a Store for the incoming packets
	 */
	incomingStore?: Store
	/**
	 * a Store for the outgoing packets
	 */
	outgoingStore?: Store

	/** Enable/Disable queue for QoS 0 packets */
	queueQoSZero?: boolean

	/** Custom log function, default uses `debug` */
	log?: (...args: any[]) => void

	autoUseTopicAlias?: boolean
	autoAssignTopicAlias?: boolean

	reschedulePings?: boolean
	servers?: Array<{
		host: string
		port: number
		protocol?:
			| 'wss'
			| 'ws'
			| 'mqtt'
			| 'mqtts'
			| 'tcp'
			| 'ssl'
			| 'wx'
			| 'wxs'
	}>
	/**
	 * true, set to false to disable re-subscribe functionality
	 */
	resubscribe?: boolean
	/**
	 * a message that will sent by the broker automatically when the client disconnect badly.
	 */
	will?: {
		/**
		 * the topic to publish
		 */
		topic: string
		/**
		 * the message to publish
		 */
		payload: Buffer | string
		/**
		 * the QoS
		 */
		qos: QoS
		/**
		 * the retain flag
		 */
		retain: boolean
		/*
		 *  properies object of will
		 * */
		properties?: {
			willDelayInterval?: number
			payloadFormatIndicator?: boolean
			messageExpiryInterval?: number
			contentType?: string
			responseTopic?: string
			correlationData?: Buffer
			userProperties?: UserProperties
		}

		authPacket?: any

		/** Prevent to call `connect` in constructor */
		manualConnect?: boolean
	}
	transformWsUrl?: (
		url: string,
		options: IClientOptions,
		client: MqttClient,
	) => string
	properties?: {
		sessionExpiryInterval?: number
		receiveMaximum?: number
		maximumPacketSize?: number
		topicAliasMaximum?: number
		requestResponseInformation?: boolean
		requestProblemInformation?: boolean
		userProperties?: UserProperties
		authenticationMethod?: string
		authenticationData?: Buffer
	}
	messageIdProvider?: IMessageIdProvider

	browserBufferTimeout?: number

	objectMode?: boolean
}

export interface IClientPublishOptions {
	/**
	 * the QoS
	 */
	qos?: QoS
	/**
	 * the retain flag
	 */
	retain?: boolean
	/**
	 * whether or not mark a message as duplicate
	 */
	dup?: boolean
	/*
	 *  MQTT 5.0 properties object
	 */
	properties?: {
		payloadFormatIndicator?: boolean
		messageExpiryInterval?: number
		topicAlias?: number
		responseTopic?: string
		correlationData?: Buffer
		userProperties?: UserProperties
		subscriptionIdentifier?: number
		contentType?: string
	}
	/**
	 * callback called when message is put into `outgoingStore`
	 */
	cbStorePut?: StorePutCallback
}
export interface IClientSubscribeOptions {
	/**
	 * the QoS
	 */
	qos: QoS
	/*
	 * no local flag
	 * */
	nl?: boolean
	/*
	 * Retain As Published flag
	 * */
	rap?: boolean
	/*
	 * Retain Handling option
	 * */
	rh?: number
	/*
	 *  MQTT 5.0 properies object of subscribe
	 * */
	properties?: {
		subscriptionIdentifier?: number
		userProperties?: UserProperties
	}
}
export interface IClientSubscribeProperties {
	/*
	 *  MQTT 5.0 properies object of subscribe
	 * */
	properties?: {
		subscriptionIdentifier?: number
		userProperties?: UserProperties
	}
}
export interface IClientReconnectOptions {
	/**
	 * a Store for the incoming packets
	 */
	incomingStore?: Store
	/**
	 * a Store for the outgoing packets
	 */
	outgoingStore?: Store
}

export interface ISubscriptionGrant {
	/**
	 *  is a subscribed to topic
	 */
	topic: string
	/**
	 *  is the granted qos level on it, may return 128 on error
	 */
	qos: QoS | number
	/*
	 * no local flag
	 * */
	nl?: boolean
	/*
	 * Retain As Published flag
	 * */
	rap?: boolean
	/*
	 * Retain Handling option
	 * */
	rh?: number
}
export interface ISubscriptionRequest extends IClientSubscribeProperties {
	/**
	 *  is a subscribed to topic
	 */
	topic: string
	/**
	 *  is the granted qos level on it
	 */
	qos: QoS
	/*
	 * no local flag
	 * */
	nl?: boolean
	/*
	 * Retain As Published flag
	 * */
	rap?: boolean
	/*
	 * Retain Handling option
	 * */
	rh?: number
}

export interface ISubscriptioOptions extends IClientSubscribeProperties {
	qos: QoS
	nl?: boolean
	rap?: boolean
	rh?: number
}

export type ISubscriptionMap = {
	/**
	 * object which has topic names as object keys and as value the options, like {'test1': {qos: 0}, 'test2': {qos: 2}}.
	 */
	[topic: string]: ISubscriptioOptions
} & {
	resubscribe?: boolean
}

export type OnConnectCallback = (packet: IConnackPacket) => void
export type OnDisconnectCallback = (packet: IDisconnectPacket) => void
export type ClientSubscribeCallback = (
	err: Error | null,
	granted: ISubscriptionGrant[],
) => void
export type OnMessageCallback = (
	topic: string,
	payload: Buffer,
	packet: IPublishPacket,
) => void
export type OnPacketCallback = (packet: Packet) => void
export type OnCloseCallback = () => void
export type OnErrorCallback = (error: Error) => void
export type PacketCallback = (error?: Error, packet?: Packet) => any
export type CloseCallback = (error?: Error) => void

export interface MqttClientEventCallbacks {
	connect: OnConnectCallback
	message: OnMessageCallback
	packetsend: OnPacketCallback
	packetreceive: OnPacketCallback
	disconnect: OnDisconnectCallback
	error: OnErrorCallback
	close: OnCloseCallback
	end: VoidCallback
	reconnect: VoidCallback
	offline: VoidCallback
	outgoingEmpty: VoidCallback
}

/**
 * MqttClient constructor
 *
 * @param {Stream} stream - stream
 * @param {Object} [options] - connection options
 * (see Connection#connect)
 */
export default class MqttClient extends TypedEventEmitter<MqttClientEventCallbacks> {
	public connected: boolean

	public disconnecting: boolean

	public disconnected: boolean

	public reconnecting: boolean

	public incomingStore: Store

	public outgoingStore: Store

	public options: IClientOptions

	public queueQoSZero: boolean

	public _reconnectCount: number

	public log: (...args) => void

	public messageIdProvider: IMessageIdProvider

	public pingResp: boolean

	public outgoing: Record<
		number,
		{ volatile: boolean; cb: (err: Error, packet?: Packet) => void }
	>

	public messageIdToTopic: Record<number, string[]>

	public noop: (error?: any) => void

	public pingTimer: any

	public stream: IStream

	public queue: { packet: Packet; cb: PacketCallback }[]

	private streamBuilder: StreamBuilder

	private _resubscribeTopics: ISubscriptionMap

	private connackTimer: NodeJS.Timeout

	private reconnectTimer: NodeJS.Timeout

	private _storeProcessing: boolean

	private _packetIdsDuringStoreProcessing: Record<number, boolean>

	private _storeProcessingQueue: {
		invoke: () => any
		cbStorePut?: DoneCallback
		callback: GenericCallback<any>
	}[]

	private _firstConnection: boolean

	private topicAliasRecv: TopicAliasRecv

	private topicAliasSend: TopicAliasSend

	private _deferredReconnect: () => void

	private connackPacket: IConnackPacket

	public static defaultId() {
		return `mqttjs_${Math.random().toString(16).substr(2, 8)}`
	}

	constructor(streamBuilder: StreamBuilder, options: IClientOptions) {
		super()

		this.options = options || {}

		// Defaults
		for (const k in defaultConnectOptions) {
			if (typeof this.options[k] === 'undefined') {
				this.options[k] = defaultConnectOptions[k]
			} else {
				this.options[k] = options[k]
			}
		}

		this.log = this.options.log || debug
		this.noop = this._noop.bind(this)

		this.log('MqttClient :: options.protocol', options.protocol)
		this.log(
			'MqttClient :: options.protocolVersion',
			options.protocolVersion,
		)
		this.log('MqttClient :: options.username', options.username)
		this.log('MqttClient :: options.keepalive', options.keepalive)
		this.log(
			'MqttClient :: options.reconnectPeriod',
			options.reconnectPeriod,
		)
		this.log(
			'MqttClient :: options.rejectUnauthorized',
			options.rejectUnauthorized,
		)
		this.log(
			'MqttClient :: options.properties.topicAliasMaximum',
			options.properties
				? options.properties.topicAliasMaximum
				: undefined,
		)

		this.options.clientId =
			typeof options.clientId === 'string'
				? options.clientId
				: MqttClient.defaultId()

		this.log('MqttClient :: clientId', this.options.clientId)

		this.options.customHandleAcks =
			options.protocolVersion === 5 && options.customHandleAcks
				? options.customHandleAcks
				: (...args) => {
						args[3](null, 0)
				  }

		// Disable pre-generated write cache if requested. Will allocate buffers on-the-fly instead. WARNING: This can affect write performance
		if (!this.options.writeCache) {
			mqttPacket.writeToStream.cacheNumbers = false
		}

		this.streamBuilder = streamBuilder

		this.messageIdProvider =
			typeof this.options.messageIdProvider === 'undefined'
				? new DefaultMessageIdProvider()
				: this.options.messageIdProvider

		// Inflight message storages
		this.outgoingStore = options.outgoingStore || new Store()
		this.incomingStore = options.incomingStore || new Store()

		// Should QoS zero messages be queued when the connection is broken?
		this.queueQoSZero =
			options.queueQoSZero === undefined ? true : options.queueQoSZero

		// map of subscribed topics to support reconnection
		this._resubscribeTopics = {}

		// map of a subscribe messageId and a topic
		this.messageIdToTopic = {}

		// Ping timer, setup in _setupPingTimer
		this.pingTimer = null
		// Is the client connected?
		this.connected = false
		// Are we disconnecting?
		this.disconnecting = false
		// Packet queue
		this.queue = []
		// connack timer
		this.connackTimer = null
		// Reconnect timer
		this.reconnectTimer = null
		// Is processing store?
		this._storeProcessing = false
		// Packet Ids are put into the store during store processing
		this._packetIdsDuringStoreProcessing = {}
		// Store processing queue
		this._storeProcessingQueue = []

		// Inflight callbacks
		this.outgoing = {}

		// True if connection is first time.
		this._firstConnection = true

		if (options.properties && options.properties.topicAliasMaximum > 0) {
			if (options.properties.topicAliasMaximum > 0xffff) {
				this.log(
					'MqttClient :: options.properties.topicAliasMaximum is out of range',
				)
			} else {
				this.topicAliasRecv = new TopicAliasRecv(
					options.properties.topicAliasMaximum,
				)
			}
		}

		// Send queued packets
		this.on('connect', () => {
			const { queue } = this

			const deliver = () => {
				const entry = queue.shift()
				this.log('deliver :: entry %o', entry)
				let packet = null

				if (!entry) {
					this._resubscribe()
					return
				}

				packet = entry.packet
				this.log('deliver :: call _sendPacket for %o', packet)
				let send = true
				if (packet.messageId && packet.messageId !== 0) {
					if (!this.messageIdProvider.register(packet.messageId)) {
						send = false
					}
				}
				if (send) {
					this._sendPacket(packet, (err) => {
						if (entry.cb) {
							entry.cb(err)
						}
						deliver()
					})
				} else {
					this.log(
						'messageId: %d has already used. The message is skipped and removed.',
						packet.messageId,
					)
					deliver()
				}
			}

			this.log('connect :: sending queued packets')
			deliver()
		})

		this.on('close', () => {
			this.log('close :: connected set to `false`')
			this.connected = false

			this.log('close :: clearing connackTimer')
			clearTimeout(this.connackTimer)

			this.log('close :: clearing ping timer')
			if (this.pingTimer !== null) {
				this.pingTimer.clear()
				this.pingTimer = null
			}

			if (this.topicAliasRecv) {
				this.topicAliasRecv.clear()
			}

			this.log('close :: calling _setupReconnect')
			this._setupReconnect()
		})

		if (!this.options.manualConnect) {
			this.log('MqttClient :: setting up stream')
			this.connect()
		}
	}

	/**
	 * Setup the event handlers in the inner stream, sends `connect` and `auth` packets
	 */
	public connect() {
		const writable = new Writable()
		const parser = mqttPacket.parser(this.options)
		let completeParse = null
		const packets = []

		this.log('connect :: calling method to clear reconnect')
		this._clearReconnect()

		this.log(
			'connect :: using streamBuilder provided to client to create stream',
		)
		this.stream = this.streamBuilder(this)

		parser.on('packet', (packet) => {
			this.log('parser :: on packet push to packets array.')
			packets.push(packet)
		})

		const work = () => {
			this.log('work :: getting next packet in queue')
			const packet = packets.shift()

			if (packet) {
				this.log('work :: packet pulled from queue')
				handlePacket(this, packet, nextTickWork)
			} else {
				this.log('work :: no packets in queue')
				const done = completeParse
				completeParse = null
				this.log('work :: done flag is %s', !!done)
				if (done) done()
			}
		}

		const nextTickWork = () => {
			if (packets.length) {
				nextTick(work)
			} else {
				const done = completeParse
				completeParse = null
				done()
			}
		}

		writable._write = (buf, enc, done) => {
			completeParse = done
			this.log('writable stream :: parsing buffer')
			parser.parse(buf)
			work()
		}

		const streamErrorHandler = (error) => {
			this.log('streamErrorHandler :: error', error.message)
			if (socketErrors.includes(error.code)) {
				// handle error
				this.log('streamErrorHandler :: emitting error')
				this.emit('error', error)
			} else {
				this.noop(error)
			}
		}

		this.log('connect :: pipe stream to writable stream')
		this.stream.pipe(writable)

		// Suppress connection errors
		this.stream.on('error', streamErrorHandler)

		// Echo stream close
		this.stream.on('close', () => {
			this.log('(%s)stream :: on close', this.options.clientId)
			this._flushVolatile()
			this.log('stream: emit close to MqttClient')
			this.emit('close')
		})

		// Send a connect packet
		this.log('connect: sending packet `connect`')
		const connectPacket: IConnectPacket = Object.create(this.options)
		connectPacket.cmd = 'connect'
		if (this.topicAliasRecv) {
			if (!connectPacket.properties) {
				connectPacket.properties = {}
			}
			if (this.topicAliasRecv) {
				connectPacket.properties.topicAliasMaximum =
					this.topicAliasRecv.max
			}
		}
		// avoid message queue
		this._writePacket(connectPacket)

		// Echo connection errors
		parser.on('error', this.emit.bind(this, 'error'))

		// auth
		if (this.options.properties) {
			if (
				!this.options.properties.authenticationMethod &&
				this.options.properties.authenticationData
			) {
				this.end(() =>
					this.emit(
						'error',
						new Error('Packet has no Authentication Method'),
					),
				)
				return this
			}
			if (
				this.options.properties.authenticationMethod &&
				this.options.authPacket &&
				typeof this.options.authPacket === 'object'
			) {
				const authPacket: IAuthPacket = {
					cmd: 'auth',
					reasonCode: 0,
					...this.options.authPacket,
				}
				this._writePacket(authPacket)
			}
		}

		// many drain listeners are needed for qos 1 callbacks if the connection is intermittent
		this.stream.setMaxListeners(1000)

		clearTimeout(this.connackTimer)
		this.connackTimer = setTimeout(() => {
			this.log(
				'!!connectTimeout hit!! Calling _cleanUp with force `true`',
			)
			this._cleanUp(true)
		}, this.options.connectTimeout)

		return this
	}

	private _flushVolatile() {
		if (this.outgoing) {
			this.log(
				'_flushVolatile :: deleting volatile messages from the queue and setting their callbacks as error function',
			)
			Object.keys(this.outgoing).forEach((messageId) => {
				if (
					this.outgoing[messageId].volatile &&
					typeof this.outgoing[messageId].cb === 'function'
				) {
					this.outgoing[messageId].cb(new Error('Connection closed'))
					delete this.outgoing[messageId]
				}
			})
		}
	}

	private _flush() {
		if (this.outgoing) {
			this.log('_flush: queue exists? %b', !!this.outgoing)
			Object.keys(this.outgoing).forEach((messageId) => {
				if (typeof this.outgoing[messageId].cb === 'function') {
					this.outgoing[messageId].cb(new Error('Connection closed'))
					// This is suspicious.  Why do we only delete this if we have a callback?
					// If this is by-design, then adding no as callback would cause this to get deleted unintentionally.
					delete this.outgoing[messageId]
				}
			})
		}
	}

	private _removeTopicAliasAndRecoverTopicName(packet: IPublishPacket) {
		let alias: number | undefined

		if (packet.properties) {
			alias = packet.properties.topicAlias
		}

		let topic = packet.topic.toString()

		this.log(
			'_removeTopicAliasAndRecoverTopicName :: alias %d, topic %o',
			alias,
			topic,
		)

		if (topic.length === 0) {
			// restore topic from alias
			if (typeof alias === 'undefined') {
				return new Error('Unregistered Topic Alias')
			}
			topic = this.topicAliasSend.getTopicByAlias(alias)
			if (typeof topic === 'undefined') {
				return new Error('Unregistered Topic Alias')
			}
			packet.topic = topic
		}
		if (alias) {
			delete packet.properties.topicAlias
		}
	}

	private _checkDisconnecting(callback: GenericCallback<any>) {
		if (this.disconnecting) {
			if (callback && callback !== this.noop) {
				callback(new Error('client disconnecting'))
			} else {
				this.emit('error', new Error('client disconnecting'))
			}
		}
		return this.disconnecting
	}

	/**
	 * publish - publish <message> to <topic>
	 *
	 * @param {String} topic - topic to publish to
	 * @param {String, Buffer} message - message to publish
	 * @param {Object} [opts] - publish options, includes:
	 *    {Number} qos - qos level to publish on
	 *    {Boolean} retain - whether or not to retain the message
	 *    {Boolean} dup - whether or not mark a message as duplicate
	 *    {Function} cbStorePut - function(){} called when message is put into `outgoingStore`
	 * @param {Function} [callback] - function(err){}
	 *    called when publish succeeds or fails
	 * @returns {MqttClient} this - for chaining
	 * @api public
	 *
	 * @example client.publish('topic', 'message');
	 * @example
	 *     client.publish('topic', 'message', {qos: 1, retain: true, dup: true});
	 * @example client.publish('topic', 'message', console.log);
	 */
	public publish(
		topic: string,
		message: string | Buffer,
		opts?: IClientPublishOptions | DoneCallback,
		callback?: DoneCallback,
	): MqttClient {
		this.log('publish :: message `%s` to topic `%s`', message, topic)
		const { options } = this

		// .publish(topic, payload, cb);
		if (typeof opts === 'function') {
			callback = opts as DoneCallback
			opts = {} as IClientPublishOptions
		}

		// default opts
		const defaultOpts: IClientPublishOptions = {
			qos: 0,
			retain: false,
			dup: false,
		}
		opts = { ...defaultOpts, ...opts }

		const { qos, retain, dup, properties, cbStorePut } = opts

		if (this._checkDisconnecting(callback)) {
			return this
		}

		const publishProc = () => {
			let messageId = 0
			if (qos === 1 || qos === 2) {
				messageId = this._nextId()
				if (messageId === null) {
					this.log('No messageId left')
					return false
				}
			}
			const packet: IPublishPacket = {
				cmd: 'publish',
				topic,
				payload: message,
				qos,
				retain,
				messageId,
				dup,
			}

			if (options.protocolVersion === 5) {
				packet.properties = properties
			}

			this.log('publish :: qos', qos)
			switch (qos) {
				case 1:
				case 2:
					// Add to callbacks
					this.outgoing[packet.messageId] = {
						volatile: false,
						cb: callback || this.noop,
					}
					this.log('MqttClient:publish: packet cmd: %s', packet.cmd)
					this._sendPacket(packet, undefined, cbStorePut)
					break
				default:
					this.log('MqttClient:publish: packet cmd: %s', packet.cmd)
					this._sendPacket(packet, callback, cbStorePut)
					break
			}
			return true
		}

		if (
			this._storeProcessing ||
			this._storeProcessingQueue.length > 0 ||
			!publishProc()
		) {
			this._storeProcessingQueue.push({
				invoke: publishProc,
				cbStorePut: opts.cbStorePut,
				callback,
			})
		}
		return this
	}

	/**
	 * subscribe - subscribe to <topic>
	 *
	 * @param {String, Array, Object} topic - topic(s) to subscribe to, supports objects in the form {'topic': qos}
	 * @param {Object} [opts] - optional subscription options, includes:
	 *    {Number} qos - subscribe qos level
	 * @param {Function} [callback] - function(err, granted){} where:
	 *    {Error} err - subscription error (none at the moment!)
	 *    {Array} granted - array of {topic: 't', qos: 0}
	 * @returns {MqttClient} this - for chaining
	 * @api public
	 * @example client.subscribe('topic');
	 * @example client.subscribe('topic', {qos: 1});
	 * @example client.subscribe({'topic': {qos: 0}, 'topic2': {qos: 1}}, console.log);
	 * @example client.subscribe('topic', console.log);
	 */
	public subscribe(
		topicObject: string | string[] | ISubscriptionMap,
		opts?:
			| IClientSubscribeOptions
			| IClientSubscribeProperties
			| ClientSubscribeCallback,
		callback?: ClientSubscribeCallback,
	): MqttClient {
		const subs: ISubscriptionRequest[] = []
		callback = callback || this.noop
		const version = this.options.protocolVersion

		if (typeof callback !== 'function') {
			opts = callback
			callback = this.noop
		}

		// force re-subscribe on reconnect. This is only true
		// when provided `topicObject` is `this._resubscribeTopics`
		let resubscribe = false
		let topicsList = []

		if (typeof topicObject === 'string') {
			topicsList = [topicObject]
		} else if (Array.isArray(topicObject)) {
			topicsList = topicObject
		} else if (typeof topicObject === 'object') {
			resubscribe = topicObject.resubscribe
			delete topicObject.resubscribe
			topicsList = Object.keys(topicObject)
		}

		// validate topics
		const invalidTopic = validations.validateTopics(topicsList)
		if (invalidTopic !== null) {
			setImmediate(callback, new Error(`Invalid topic ${invalidTopic}`))
			return this
		}

		if (this._checkDisconnecting(callback)) {
			this.log('subscribe: discconecting true')
			return this
		}

		const defaultOpts: Partial<IClientSubscribeOptions> = {
			qos: 0,
		}

		if (version === 5) {
			defaultOpts.nl = false
			defaultOpts.rap = false
			defaultOpts.rh = 0
		}
		opts = { ...defaultOpts, ...opts } as IClientSubscribeOptions

		const properties = opts.properties

		const parseSub = (
			topic: string,
			subOptions?: IClientSubscribeOptions,
		) => {
			// subOptions is defined only when providing a subs map, use opts otherwise
			subOptions = (subOptions || opts) as IClientSubscribeOptions
			if (
				!Object.prototype.hasOwnProperty.call(
					this._resubscribeTopics,
					topic,
				) ||
				this._resubscribeTopics[topic].qos < subOptions.qos ||
				resubscribe
			) {
				const currentOpts: ISubscription & IClientSubscribeProperties =
					{
						topic,
						qos: subOptions.qos,
					}
				if (version === 5) {
					currentOpts.nl = subOptions.nl
					currentOpts.rap = subOptions.rap
					currentOpts.rh = subOptions.rh
					// use opts.properties
					currentOpts.properties = properties
				}
				this.log(
					'subscribe: pushing topic `%s` and qos `%s` to subs list',
					currentOpts.topic,
					currentOpts.qos,
				)
				subs.push(currentOpts)
			}
		}

		if (Array.isArray(topicObject)) {
			// array of topics
			topicObject.forEach((topic) => {
				this.log('subscribe: array topic %s', topic)
				parseSub(topic)
			})
		} else {
			// object topic --> subOptions (no properties)
			Object.keys(topicObject).forEach((topic) => {
				this.log('subscribe: object topic %s, %o', topic, topic[topic])
				parseSub(topic, topic[topic])
			})
		}

		if (!subs.length) {
			callback(null, [])
			return this
		}

		const subscribeProc = () => {
			const messageId = this._nextId()
			if (messageId === null) {
				this.log('No messageId left')
				return false
			}

			const packet: ISubscribePacket = {
				cmd: 'subscribe',
				subscriptions: subs,
				// qos: 1,
				// retain: false,
				// dup: false,
				messageId,
			}

			if (properties) {
				packet.properties = properties
			}

			// subscriptions to resubscribe to in case of disconnect
			if (this.options.resubscribe) {
				this.log('subscribe :: resubscribe true')
				const topics = []
				subs.forEach((sub) => {
					if (this.options.reconnectPeriod > 0) {
						const topic: ISubscriptioOptions = { qos: sub.qos }
						if (version === 5) {
							topic.nl = sub.nl || false
							topic.rap = sub.rap || false
							topic.rh = sub.rh || 0
							topic.properties = sub.properties
						}
						this._resubscribeTopics[sub.topic] = topic
						topics.push(sub.topic)
					}
				})
				this.messageIdToTopic[packet.messageId] = topics
			}

			this.outgoing[packet.messageId] = {
				volatile: true,
				cb(err, packet2: ISubackPacket) {
					if (!err) {
						const { granted } = packet2
						for (let i = 0; i < granted.length; i += 1) {
							subs[i].qos = granted[i] as QoS
						}
					}

					callback(err, subs)
				},
			}
			this.log('subscribe :: call _sendPacket')
			this._sendPacket(packet)
			return true
		}

		if (
			this._storeProcessing ||
			this._storeProcessingQueue.length > 0 ||
			!subscribeProc()
		) {
			this._storeProcessingQueue.push({
				invoke: subscribeProc,
				callback,
			})
		}

		return this
	}

	/**
	 * unsubscribe - unsubscribe from topic(s)
	 *
	 * @param {String, Array} topic - topics to unsubscribe from
	 * @param {Object} [opts] - optional subscription options, includes:
	 *    {Object} properties - properties of unsubscribe packet
	 * @param {Function} [callback] - callback fired on unsuback
	 * @returns {MqttClient} this - for chaining
	 * @api public
	 * @example client.unsubscribe('topic');
	 * @example client.unsubscribe('topic', console.log);
	 */
	public unsubscribe(
		topic: string | string[],
		opts?: IClientSubscribeOptions | PacketCallback,
		callback?: PacketCallback,
	): MqttClient {
		if (typeof topic === 'string') {
			topic = [topic]
		}

		if (typeof callback !== 'function') {
			opts = callback
			callback = this.noop
		}

		const invalidTopic = validations.validateTopics(topic)
		if (invalidTopic !== null) {
			setImmediate(callback, new Error(`Invalid topic ${invalidTopic}`))
			return this
		}

		if (this._checkDisconnecting(callback)) {
			return this
		}

		const unsubscribeProc = () => {
			const messageId = this._nextId()
			if (messageId === null) {
				this.log('No messageId left')
				return false
			}
			const packet: IUnsubscribePacket = {
				cmd: 'unsubscribe',
				// qos: 1,
				messageId,
				unsubscriptions: [],
			}

			if (typeof topic === 'string') {
				packet.unsubscriptions = [topic]
			} else if (Array.isArray(topic)) {
				packet.unsubscriptions = topic
			}

			if (this.options.resubscribe) {
				packet.unsubscriptions.forEach((topic2) => {
					delete this._resubscribeTopics[topic2]
				})
			}

			if (typeof opts === 'object' && opts.properties) {
				packet.properties = opts.properties
			}

			this.outgoing[packet.messageId] = {
				volatile: true,
				cb: callback,
			}

			this.log('unsubscribe: call _sendPacket')
			this._sendPacket(packet)

			return true
		}

		if (
			this._storeProcessing ||
			this._storeProcessingQueue.length > 0 ||
			!unsubscribeProc()
		) {
			this._storeProcessingQueue.push({
				invoke: unsubscribeProc,
				callback,
			})
		}

		return this
	}

	/**
	 * end - close connection
	 *
	 * @returns {MqttClient} this - for chaining
	 * @param {Boolean} force - do not wait for all in-flight messages to be acked
	 * @param {Object} opts - added to the disconnect packet
	 * @param {Function} cb - called when the client has been closed
	 *
	 * @api public
	 */
	public end(
		force?: boolean | Partial<IDisconnectPacket> | DoneCallback,
		opts?: Partial<IDisconnectPacket> | DoneCallback,
		cb?: DoneCallback,
	): MqttClient {
		this.log('end :: (%s)', this.options.clientId)

		if (force == null || typeof force !== 'boolean') {
			cb = (opts || this.noop) as DoneCallback
			opts = force as Partial<IDisconnectPacket>
			force = false
			if (typeof opts !== 'object') {
				cb = opts
				opts = null
				if (typeof cb !== 'function') {
					cb = this.noop
				}
			}
		}

		if (typeof opts !== 'object') {
			cb = opts
			opts = null
		}

		this.log('end :: cb? %s', !!cb)
		cb = cb || this.noop

		const closeStores = () => {
			this.log('end :: closeStores: closing incoming and outgoing stores')
			this.disconnected = true
			this.incomingStore.close((e1) => {
				this.outgoingStore.close((e2) => {
					this.log('end :: closeStores: emitting end')
					this.emit('end')
					if (cb) {
						const err = e1 || e2
						this.log(
							'end :: closeStores: invoking callback with args',
						)
						cb(err)
					}
				})
			})
			if (this._deferredReconnect) {
				this._deferredReconnect()
			}
		}

		const finish = () => {
			// defer closesStores of an I/O cycle,
			// just to make sure things are
			// ok for websockets
			this.log(
				'end :: (%s) :: finish :: calling _cleanUp with force %s',
				this.options.clientId,
				force,
			)
			this._cleanUp(
				<boolean>force,
				() => {
					this.log(
						'end :: finish :: calling process.nextTick on closeStores',
					)
					// const boundProcess = nextTick.bind(null, closeStores)
					nextTick(closeStores)
				},
				opts,
			)
		}

		if (this.disconnecting) {
			cb()
			return this
		}

		this._clearReconnect()

		this.disconnecting = true

		if (!force && Object.keys(this.outgoing).length > 0) {
			// wait 10ms, just to be sure we received all of it
			this.log(
				'end :: (%s) :: calling finish in 10ms once outgoing is empty',
				this.options.clientId,
			)
			this.once('outgoingEmpty', setTimeout.bind(null, finish, 10))
		} else {
			this.log(
				'end :: (%s) :: immediately calling finish',
				this.options.clientId,
			)
			finish()
		}

		return this
	}

	/**
	 * removeOutgoingMessage - remove a message in outgoing store
	 * the outgoing callback will be called withe Error('Message removed') if the message is removed
	 *
	 * @param {Number} messageId - messageId to remove message
	 * @returns {MqttClient} this - for chaining
	 * @api public
	 *
	 * @example client.removeOutgoingMessage(client.getLastAllocated());
	 */
	public removeOutgoingMessage(messageId: number): MqttClient {
		if (this.outgoing[messageId]) {
			const { cb } = this.outgoing[messageId]
			this._removeOutgoingAndStoreMessage(messageId, () => {
				cb(new Error('Message removed'))
			})
		}
		return this
	}

	/**
	 * reconnect - connect again using the same options as connect()
	 *
	 * @param {Object} [opts] - optional reconnect options, includes:
	 *    {Store} incomingStore - a store for the incoming packets
	 *    {Store} outgoingStore - a store for the outgoing packets
	 *    if opts is not given, current stores are used
	 * @returns {MqttClient} this - for chaining
	 *
	 * @api public
	 */
	public reconnect(
		opts?: Pick<IClientOptions, 'incomingStore' | 'outgoingStore'>,
	): MqttClient {
		this.log('client reconnect')
		const f = () => {
			if (opts) {
				this.options.incomingStore = opts.incomingStore
				this.options.outgoingStore = opts.outgoingStore
			} else {
				this.options.incomingStore = null
				this.options.outgoingStore = null
			}
			this.incomingStore = this.options.incomingStore || new Store()
			this.outgoingStore = this.options.outgoingStore || new Store()
			this.disconnecting = false
			this.disconnected = false
			this._deferredReconnect = null
			this._reconnect()
		}

		if (this.disconnecting && !this.disconnected) {
			this._deferredReconnect = f
		} else {
			f()
		}
		return this
	}

	/**
	 * _reconnect - implement reconnection
	 * @api privateish
	 */
	private _reconnect() {
		this.log('_reconnect: emitting reconnect to client')
		this.emit('reconnect')
		if (this.connected) {
			this.end(() => {
				this.connect()
			})
			this.log('client already connected. disconnecting first.')
		} else {
			this.log('_reconnect: calling connect')
			this.connect()
		}
	}

	/**
	 * _setupReconnect - setup reconnect timer
	 */
	private _setupReconnect() {
		if (
			!this.disconnecting &&
			!this.reconnectTimer &&
			this.options.reconnectPeriod > 0
		) {
			if (!this.reconnecting) {
				this.log('_setupReconnect :: emit `offline` state')
				this.emit('offline')
				this.log('_setupReconnect :: set `reconnecting` to `true`')
				this.reconnecting = true
			}
			this.log(
				'_setupReconnect :: setting reconnectTimer for %d ms',
				this.options.reconnectPeriod,
			)
			this.reconnectTimer = setInterval(() => {
				this.log('reconnectTimer :: reconnect triggered!')
				this._reconnect()
			}, this.options.reconnectPeriod)
		} else {
			this.log('_setupReconnect :: doing nothing...')
		}
	}

	/**
	 * _clearReconnect - clear the reconnect timer
	 */
	private _clearReconnect() {
		this.log('_clearReconnect : clearing reconnect timer')
		if (this.reconnectTimer) {
			clearInterval(this.reconnectTimer)
			this.reconnectTimer = null
		}
	}

	/**
	 * _cleanUp - clean up on connection end
	 * @api private
	 */
	private _cleanUp(forced: boolean, done?: DoneCallback, opts = {}) {
		if (done) {
			this.log('_cleanUp :: done callback provided for on stream close')
			this.stream.on('close', done)
		}

		this.log('_cleanUp :: forced? %s', forced)
		if (forced) {
			if (this.options.reconnectPeriod === 0 && this.options.clean) {
				this._flush()
			}
			this.log(
				'_cleanUp :: (%s) :: destroying stream',
				this.options.clientId,
			)
			this.stream.destroy()
		} else {
			const packet: IDisconnectPacket = { cmd: 'disconnect', ...opts }
			this.log(
				'_cleanUp :: (%s) :: call _sendPacket with disconnect packet',
				this.options.clientId,
			)
			this._sendPacket(packet, () => {
				this.log(
					'_cleanUp :: (%s) :: destroying stream',
					this.options.clientId,
				)
				setImmediate(() => {
					this.stream.end(() => {
						this.log(
							'_cleanUp :: (%s) :: stream destroyed',
							this.options.clientId,
						)
						// once stream is closed the 'close' event will fire and that will
						// emit client `close` event and call `done` callback if done is provided
					})
				})
			})
		}

		if (!this.disconnecting) {
			this.log(
				'_cleanUp :: client not disconnecting. Clearing and resetting reconnect.',
			)
			this._clearReconnect()
			this._setupReconnect()
		}

		if (this.pingTimer !== null) {
			this.log('_cleanUp :: clearing pingTimer')
			this.pingTimer.clear()
			this.pingTimer = null
		}

		if (done && !this.connected) {
			this.log(
				'_cleanUp :: (%s) :: removing stream `done` callback `close` listener',
				this.options.clientId,
			)
			this.stream.removeListener('close', done)
			done()
		}
	}

	private _storeAndSend(
		packet: Packet,
		cb: DoneCallback,
		cbStorePut: DoneCallback,
	) {
		this.log(
			'storeAndSend :: store packet with cmd %s to outgoingStore',
			packet.cmd,
		)
		let storePacket = packet
		let err: Error | undefined
		if (storePacket.cmd === 'publish') {
			// The original packet is for sending.
			// The cloned storePacket is for storing to resend on reconnect.
			// Topic Alias must not be used after disconnected.
			storePacket = clone(packet)
			err = this._removeTopicAliasAndRecoverTopicName(
				storePacket as IPublishPacket,
			)
			if (err) {
				return cb && cb(err)
			}
		}
		this.outgoingStore.put(storePacket, (err2) => {
			if (err2) {
				return cb && cb(err2)
			}
			cbStorePut()
			this._writePacket(packet, cb)
		})
	}

	private _applyTopicAlias(packet: Packet) {
		if (this.options.protocolVersion === 5) {
			if (packet.cmd === 'publish') {
				let alias: number
				if (packet.properties) {
					alias = packet.properties.topicAlias
				}
				const topic = packet.topic.toString()
				if (this.topicAliasSend) {
					if (alias) {
						if (topic.length !== 0) {
							// register topic alias
							this.log(
								'applyTopicAlias :: register topic: %s - alias: %d',
								topic,
								alias,
							)
							if (!this.topicAliasSend.put(topic, alias)) {
								this.log(
									'applyTopicAlias :: error out of range. topic: %s - alias: %d',
									topic,
									alias,
								)
								return new Error(
									'Sending Topic Alias out of range',
								)
							}
						}
					} else if (topic.length !== 0) {
						if (this.options.autoAssignTopicAlias) {
							alias = this.topicAliasSend.getAliasByTopic(topic)
							if (alias) {
								packet.topic = ''
								packet.properties = {
									...packet.properties,
									topicAlias: alias,
								}
								this.log(
									'applyTopicAlias :: auto assign(use) topic: %s - alias: %d',
									topic,
									alias,
								)
							} else {
								alias = this.topicAliasSend.getLruAlias()
								this.topicAliasSend.put(topic, alias)
								packet.properties = {
									...packet.properties,
									topicAlias: alias,
								}
								this.log(
									'applyTopicAlias :: auto assign topic: %s - alias: %d',
									topic,
									alias,
								)
							}
						} else if (this.options.autoUseTopicAlias) {
							alias = this.topicAliasSend.getAliasByTopic(topic)
							if (alias) {
								packet.topic = ''
								packet.properties = {
									...packet.properties,
									topicAlias: alias,
								}
								this.log(
									'applyTopicAlias :: auto use topic: %s - alias: %d',
									topic,
									alias,
								)
							}
						}
					}
				} else if (alias) {
					this.log(
						'applyTopicAlias :: error out of range. topic: %s - alias: %d',
						topic,
						alias,
					)
					return new Error('Sending Topic Alias out of range')
				}
			}
		}
	}

	private _noop(err?: Error) {
		this.log('noop ::', err)
	}

	/** Writes the packet to stream and emits events */
	private _writePacket(packet: Packet, cb?: DoneCallback) {
		this.log('_writePacket :: packet: %O', packet)
		this.log('_writePacket :: emitting `packetsend`')

		this.emit('packetsend', packet)

		// When writing a packet, reschedule the ping timer
		this._shiftPingInterval()

		this.log('_writePacket :: writing to stream')
		const result = mqttPacket.writeToStream(
			packet,
			this.stream,
			this.options,
		)
		this.log('_writePacket :: writeToStream result %s', result)
		if (!result && cb && cb !== this.noop) {
			this.log(
				'_writePacket :: handle events on `drain` once through callback.',
			)
			this.stream.once('drain', cb)
		} else if (cb) {
			this.log('_writePacket :: invoking cb')
			cb()
		}
	}

	/**
	 * _sendPacket - send or queue a packet
	 * @param {Object} packet - packet options
	 * @param {Function} cb - callback when the packet is sent
	 * @param {Function} cbStorePut - called when message is put into outgoingStore
	 * @param {Boolean} noStore - send without put to the store
	 * @api private
	 */
	private _sendPacket(
		packet: Packet,
		cb?: DoneCallback,
		cbStorePut?: DoneCallback,
		noStore?: boolean,
	) {
		this.log('_sendPacket :: (%s) ::  start', this.options.clientId)
		cbStorePut = cbStorePut || this.noop
		cb = cb || this.noop

		const err = this._applyTopicAlias(packet)
		if (err) {
			cb(err)
			return
		}

		if (!this.connected) {
			// allow auth packets to be sent while authenticating with the broker (mqtt5 enhanced auth)
			if (packet.cmd === 'auth') {
				this._writePacket(packet, cb)
				return
			}

			this.log(
				'_sendPacket :: client not connected. Storing packet offline.',
			)
			this._storePacket(packet, cb, cbStorePut)
			return
		}

		// If "noStore" is true, the message is sent without being recorded in the store.
		// Messages that have not received puback or pubcomp remain in the store after disconnection
		// and are resent from the store upon reconnection.
		// For resend upon reconnection, "noStore" is set to true. This is because the message is already stored in the store.
		// This is to avoid interrupting other processes while recording to the store.
		if (noStore) {
			this._writePacket(packet, cb)
			return
		}

		switch (packet.cmd) {
			case 'publish':
				break
			case 'pubrel':
				this._storeAndSend(packet, cb, cbStorePut)
				return
			default:
				this._writePacket(packet, cb)
				return
		}

		switch (packet.qos) {
			case 2:
			case 1:
				this._storeAndSend(packet, cb, cbStorePut)
				break
			/**
			 * no need of case here since it will be caught by default
			 * and jshint comply that before default it must be a break
			 * anyway it will result in -1 evaluation
			 */
			case 0:
			/* falls through */
			default:
				this._writePacket(packet, cb)
				break
		}
		this.log('_sendPacket :: (%s) ::  end', this.options.clientId)
	}

	/**
	 * _storePacket - queue a packet
	 * @param {Object} packet - packet options
	 * @param {Function} cb - callback when the packet is sent
	 * @param {Function} cbStorePut - called when message is put into outgoingStore
	 * @api private
	 */
	private _storePacket(
		packet: Packet,
		cb: DoneCallback,
		cbStorePut: DoneCallback,
	) {
		this.log('_storePacket :: packet: %o', packet)
		this.log('_storePacket :: cb? %s', !!cb)
		cbStorePut = cbStorePut || this.noop

		let storePacket = packet
		if (storePacket.cmd === 'publish') {
			// The original packet is for sending.
			// The cloned storePacket is for storing to resend on reconnect.
			// Topic Alias must not be used after disconnected.
			storePacket = clone(packet)
			const err = this._removeTopicAliasAndRecoverTopicName(
				storePacket as IPublishPacket,
			)
			if (err) {
				return cb && cb(err)
			}
		}

		const qos = (storePacket as IPublishPacket).qos || 0
		// check that the packet is not a qos of 0, or that the command is not a publish
		if ((qos === 0 && this.queueQoSZero) || storePacket.cmd !== 'publish') {
			this.queue.push({ packet: storePacket, cb })
		} else if (qos > 0) {
			cb = this.outgoing[storePacket.messageId]
				? this.outgoing[storePacket.messageId].cb
				: null
			this.outgoingStore.put(storePacket, (err) => {
				if (err) {
					return cb && cb(err)
				}
				cbStorePut()
			})
		} else if (cb) {
			cb(new Error('No connection to broker'))
		}
	}

	/**
	 * _setupPingTimer - setup the ping timer
	 *
	 * @api private
	 */
	private _setupPingTimer() {
		this.log(
			'_setupPingTimer :: keepalive %d (seconds)',
			this.options.keepalive,
		)

		if (!this.pingTimer && this.options.keepalive) {
			this.pingResp = true
			this.pingTimer = reInterval(() => {
				this._checkPing()
			}, this.options.keepalive * 1000)
		}
	}

	/**
	 * _shiftPingInterval - reschedule the ping interval
	 *
	 * @api private
	 */
	private _shiftPingInterval() {
		if (
			this.pingTimer &&
			this.options.keepalive &&
			this.options.reschedulePings
		) {
			this.pingTimer.reschedule(this.options.keepalive * 1000)
		}
	}

	/**
	 * _checkPing - check if a pingresp has come back, and ping the server again
	 *
	 * @api private
	 */
	private _checkPing() {
		this.log('_checkPing :: checking ping...')
		if (this.pingResp) {
			this.log(
				'_checkPing :: ping response received. Clearing flag and sending `pingreq`',
			)
			this.pingResp = false
			this._sendPacket({ cmd: 'pingreq' })
		} else {
			// do a forced cleanup since socket will be in bad shape
			this.log('_checkPing :: calling _cleanUp with force true')
			this._cleanUp(true)
		}
	}

	/**
	 * @param packet the packet received by the broker
	 * @return the auth packet to be returned to the broker
	 * @api public
	 */
	public handleAuth(packet: IAuthPacket, callback: PacketCallback) {
		callback()
	}

	/**
	 * Handle messages with backpressure support, one at a time.
	 * Override at will.
	 *
	 * @param Packet packet the packet
	 * @param Function callback call when finished
	 * @api public
	 */
	public handleMessage(packet: IPublishPacket, callback: DoneCallback) {
		callback()
	}

	/**
	 * _nextId
	 * @return unsigned int
	 */
	private _nextId() {
		return this.messageIdProvider.allocate()
	}

	/**
	 * getLastMessageId
	 * @return unsigned int
	 */
	public getLastMessageId() {
		return this.messageIdProvider.getLastAllocated()
	}

	/**
	 * _resubscribe
	 * @api private
	 */
	private _resubscribe() {
		this.log('_resubscribe')
		const _resubscribeTopicsKeys = Object.keys(this._resubscribeTopics)
		if (
			!this._firstConnection &&
			(this.options.clean ||
				(this.options.protocolVersion === 5 &&
					!this.connackPacket.sessionPresent)) &&
			_resubscribeTopicsKeys.length > 0
		) {
			if (this.options.resubscribe) {
				if (this.options.protocolVersion === 5) {
					this.log('_resubscribe: protocolVersion 5')
					for (
						let topicI = 0;
						topicI < _resubscribeTopicsKeys.length;
						topicI++
					) {
						const resubscribeTopic: ISubscriptionMap = {}
						resubscribeTopic[_resubscribeTopicsKeys[topicI]] =
							this._resubscribeTopics[
								_resubscribeTopicsKeys[topicI]
							]
						resubscribeTopic.resubscribe = true
						this.subscribe(resubscribeTopic, {
							properties:
								resubscribeTopic[_resubscribeTopicsKeys[topicI]]
									.properties,
						})
					}
				} else {
					this._resubscribeTopics.resubscribe = true
					this.subscribe(this._resubscribeTopics)
				}
			} else {
				this._resubscribeTopics = {}
			}
		}

		this._firstConnection = false
	}

	/**
	 * _onConnect
	 *
	 * @api private
	 */
	private _onConnect(packet: IConnackPacket) {
		if (this.disconnected) {
			this.emit('connect', packet)
			return
		}

		this.connackPacket = packet
		this.messageIdProvider.clear()
		this._setupPingTimer()

		this.connected = true

		const startStreamProcess = () => {
			let outStore = this.outgoingStore.createStream()

			const remove = () => {
				outStore.destroy()
				outStore = null
				this._flushStoreProcessingQueue()
				clearStoreProcessing()
			}

			const clearStoreProcessing = () => {
				this._storeProcessing = false
				this._packetIdsDuringStoreProcessing = {}
			}

			this.once('close', remove)
			outStore.on('error', (err) => {
				clearStoreProcessing()
				this._flushStoreProcessingQueue()
				this.removeListener('close', remove)
				this.emit('error', err)
			})

			const storeDeliver = () => {
				// edge case, we wrapped this twice
				if (!outStore) {
					return
				}

				const packet2 = outStore.read(1)

				let cb: PacketCallback

				if (!packet2) {
					// read when data is available in the future
					outStore.once('readable', storeDeliver)
					return
				}

				this._storeProcessing = true

				// Skip already processed store packets
				if (this._packetIdsDuringStoreProcessing[packet2.messageId]) {
					storeDeliver()
					return
				}

				// Avoid unnecessary stream read operations when disconnected
				if (!this.disconnecting && !this.reconnectTimer) {
					cb = this.outgoing[packet2.messageId]
						? this.outgoing[packet2.messageId].cb
						: null
					this.outgoing[packet2.messageId] = {
						volatile: false,
						cb(err, status) {
							// Ensure that the original callback passed in to publish gets invoked
							if (cb) {
								cb(err, status)
							}

							storeDeliver()
						},
					}
					this._packetIdsDuringStoreProcessing[packet2.messageId] =
						true
					if (this.messageIdProvider.register(packet2.messageId)) {
						this._sendPacket(packet2, undefined, undefined, true)
					} else {
						this.log(
							'messageId: %d has already used.',
							packet2.messageId,
						)
					}
				} else if (outStore.destroy) {
					outStore.destroy()
				}
			}

			outStore.on('end', () => {
				let allProcessed = true
				for (const id in this._packetIdsDuringStoreProcessing) {
					if (!this._packetIdsDuringStoreProcessing[id]) {
						allProcessed = false
						break
					}
				}
				if (allProcessed) {
					clearStoreProcessing()
					this.removeListener('close', remove)
					this._invokeAllStoreProcessingQueue()
					this.emit('connect', packet)
				} else {
					startStreamProcess()
				}
			})
			storeDeliver()
		}
		// start flowing
		startStreamProcess()
	}

	private _invokeStoreProcessingQueue() {
		// If _storeProcessing is true, the message is resending.
		// During resend, processing is skipped to prevent new messages from interrupting. #1635
		if (!this._storeProcessing && this._storeProcessingQueue.length > 0) {
			const f = this._storeProcessingQueue[0]
			if (f && f.invoke()) {
				this._storeProcessingQueue.shift()
				return true
			}
		}
		return false
	}

	private _invokeAllStoreProcessingQueue() {
		while (this._invokeStoreProcessingQueue()) {
			/* empty */
		}
	}

	private _flushStoreProcessingQueue() {
		for (const f of this._storeProcessingQueue) {
			if (f.cbStorePut) f.cbStorePut(new Error('Connection closed'))
			if (f.callback) f.callback(new Error('Connection closed'))
		}
		this._storeProcessingQueue.splice(0)
	}

	/**
	 * _removeOutgoingAndStoreMessage
	 * @param {Number} messageId - messageId to remove message
	 * @param {Function} cb - called when the message removed
	 * @api private
	 */
	private _removeOutgoingAndStoreMessage(
		messageId: number,
		cb: PacketCallback,
	) {
		delete this.outgoing[messageId]
		this.outgoingStore.del({ messageId }, (err, packet) => {
			cb(err, packet)
			this.messageIdProvider.deallocate(messageId)
			this._invokeStoreProcessingQueue()
		})
	}
}
