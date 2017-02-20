/// <reference types="node" />
/**
 * Module dependencies
 */
import * as events from 'events';
import Store from './store';
import { Url } from 'url';
import EventEmitter = NodeJS.EventEmitter;
export declare type QoS = 0 | 1 | 2;
export declare type PacketCmd = 'connack' | 'connect' | 'disconnect' | 'pingreq' | 'pingresp' | 'puback' | 'pubcomp' | 'publish' | 'pubrel' | 'pubrec' | 'suback' | 'subscribe' | 'unsuback' | 'unsubscribe';
export interface IPacket {
    cmd: PacketCmd;
    messageId?: number;
    length?: number;
}
export interface ConnectPacket extends IPacket {
    cmd: 'connect';
    clientId: string;
    protocolVersion?: 4 | 3;
    protocolId?: 'MQTT' | 'MQIsdp';
    clean?: boolean;
    keepalive?: number;
    username?: string;
    password?: Buffer;
    will?: {
        topic: string;
        payload: Buffer;
        qos?: QoS;
        retain?: boolean;
    };
}
export interface PublishPacket extends IPacket {
    cmd: 'publish';
    qos: QoS;
    dup: boolean;
    retain: boolean;
    topic: string;
    payload: string | Buffer;
}
export interface ConnackPacket extends IPacket {
    cmd: 'connack';
    returnCode: number;
    sessionPresent: boolean;
}
export interface SubscribePacket extends IPacket {
    cmd: 'subscribe';
    subscriptions: Array<{
        topic: string;
        qos: QoS;
    }>;
}
export interface SubackPacket extends IPacket {
    cmd: 'suback';
    granted: number[];
}
export interface UnsubscribePacket extends IPacket {
    cmd: 'unsubscribe';
    unsubscriptions: string[];
}
export interface UnsubackPacket extends IPacket {
    cmd: 'unsuback';
}
export interface PubackPacket extends IPacket {
    cmd: 'puback';
}
export interface PubcompPacket extends IPacket {
    cmd: 'pubcomp';
}
export interface PubrelPacket extends IPacket {
    cmd: 'pubrel';
}
export interface PubrecPacket extends IPacket {
    cmd: 'pubrec';
}
export interface PingreqPacket extends IPacket {
    cmd: 'pingreq';
}
export interface PingrespPacket extends IPacket {
    cmd: 'pingresp';
}
export interface DisconnectPacket extends IPacket {
    cmd: 'disconnect';
}
export declare type Packet = ConnectPacket | PublishPacket | ConnackPacket | SubscribePacket | SubackPacket | UnsubscribePacket | UnsubackPacket | PubackPacket | PubcompPacket | PubrelPacket | PingreqPacket | PingrespPacket | DisconnectPacket | PubrecPacket;
export interface SubscriptionGrant {
    /**
     *  is a subscribed to topic
     */
    topic: string;
    /**
     *  is the granted qos level on it
     */
    qos: QoS | number;
}
export interface SubscriptionRequest {
    /**
     *  is a subscribed to topic
     */
    topic: string;
    /**
     *  is the granted qos level on it
     */
    qos: QoS;
}
export interface SubscriptionMap {
    /**
     * object which has topic names as object keys and as value the QoS, like {'test1': 0, 'test2': 1}.
     */
    [topic: string]: QoS;
}
/**
 * MQTT CLIENT
 */
export interface ClientOptions extends SecureClientOptions, Url {
    protocol?: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl';
    wsOptions?: {
        [x: string]: any;
    };
    /**
     *  10 seconds, set to 0 to disable
     */
    keepalive?: number;
    /**
     * 'mqttjs_' + Math.random().toString(16).substr(2, 8)
     */
    clientId?: string;
    /**
     * 'MQTT'
     */
    protocolId?: string;
    /**
     * 4
     */
    protocolVersion?: number;
    /**
     * true, set to false to receive QoS 1 and 2 messages while offline
     */
    clean?: boolean;
    /**
     * 1000 milliseconds, interval between two reconnections
     */
    reconnectPeriod?: number;
    /**
     * 30 * 1000 milliseconds, time to wait before a CONNACK is received
     */
    connectTimeout?: number;
    /**
     * the username required by your broker, if any
     */
    username?: string;
    /**
     * the password required by your broker, if any
     */
    password?: string;
    /**
     * a Store for the incoming packets
     */
    incomingStore?: Store;
    /**
     * a Store for the outgoing packets
     */
    outgoingStore?: Store;
    queueQoSZero?: boolean;
    reschedulePings?: boolean;
    servers?: Array<{
        host: string;
        port: number | string;
    }>;
    /**
     * a message that will sent by the broker automatically when the client disconnect badly.
     */
    will?: {
        /**
         * the topic to publish
         */
        topic: string;
        /**
         * the message to publish
         */
        payload: string;
        /**
         * the QoS
         */
        qos: QoS;
        /**
         * the retain flag
         */
        retain: boolean;
    };
    transformWsUrl?: (url: string, options: ClientOptions, client: MqttClient) => string;
}
export interface SecureClientOptions {
    /**
     * path to private key
     */
    key?: string;
    /**
     * path to corresponding public cert
     */
    cert?: string;
    ca?: string;
    rejectUnauthorized?: boolean;
}
export interface ClientPublishOptions {
    /**
     * the QoS
     */
    qos?: QoS;
    /**
     * the retain flag
     */
    retain?: boolean;
}
export interface ClientSubscribeOptions {
    /**
     * the QoS
     */
    qos?: QoS;
}
export declare type ClientSubscribeCallback = (err: Error, granted: SubscriptionGrant[]) => void;
export declare type OnMessageCallback = (topic: string, payload: Buffer, packet: Packet) => void;
export declare type OnPacketCallback = (packet: Packet) => void;
export declare type OnErrorCallback = (error: Error) => void;
export declare type PacketCallback = (error?: Error, packet?: Packet) => any;
export interface IReinterval {
    clear: () => void;
    reschedule(ms: number): any;
}
export interface IStream extends EventEmitter {
    pipe(to: any): any;
    destroy(): any;
    end(): any;
}
/**
 * MqttClient constructor
 *
 * @param {Stream} stream - stream
 * @param {Object} [options] - connection options
 * (see Connection#connect)
 */
export declare class MqttClient extends events.EventEmitter {
    connackTimer: NodeJS.Timer;
    reconnectTimer: NodeJS.Timer;
    pingTimer: IReinterval;
    connected: false;
    disconnecting: boolean;
    disconnected: boolean;
    reconnecting: boolean;
    pingResp: boolean;
    nextId: number;
    queue: Array<{
        packet: Packet;
        cb: PacketCallback;
    }>;
    _subscribedTopics: any;
    outgoing: {
        [x: number]: PacketCallback;
    };
    incomingStore: Store;
    outgoingStore: Store;
    stream: IStream;
    streamBuilder: (MqttClient) => IStream;
    options: ClientOptions;
    queueQoSZero: boolean;
    on(event: 'message', cb: OnMessageCallback): this;
    on(event: 'packetsend' | 'packetreceive', cb: OnPacketCallback): this;
    on(event: 'error', cb: OnErrorCallback): this;
    on(event: string, cb: Function): any;
    once(event: 'message', cb: OnMessageCallback): this;
    once(event: 'packetsend' | 'packetreceive', cb: OnPacketCallback): this;
    once(event: 'error', cb: OnErrorCallback): this;
    once(event: string, cb: Function): any;
    constructor(streamBuilder: any, options: any);
    /**
     * setup the event handlers in the inner stream.
     *
     * @api private
     */
    _setupStream(): void;
    _handlePacket(packet: Packet, done: PacketCallback): void;
    _checkDisconnecting(callback: PacketCallback): boolean;
    /**
     * publish - publish <message> to <topic>
     *
     * @param {String} topic - topic to publish to
     * @param {(String|Buffer)} message - message to publish
     *
     * @param {Object}    [opts] - publish options, includes:
     *   @param {Number}  [opts.qos] - qos level to publish on
     *   @param {Boolean} [opts.retain] - whether or not to retain the message
     *
     * @param {Function} [callback] - function(err){}
     *    called when publish succeeds or fails
     * @returns {Client} this - for chaining
     * @api public
     *
     * @example client.publish('topic', 'message');
     * @example
     *     client.publish('topic', 'message', {qos: 1, retain: true});
     * @example client.publish('topic', 'message', console.log);
     */
    publish(topic: string, message: string | Buffer, opts: ClientPublishOptions, callback?: PacketCallback): this;
    publish(topic: string, message: string | Buffer, callback?: PacketCallback): this;
    /**
     * subscribe - subscribe to <topic>
     *
     * @param {String, Array, Object} topic - topic(s) to subscribe to, supports objects in the form {'topic': qos}
     * @param {Object} [opts] - optional subscription options, includes:
     * @param  {Number} [opts.qos] - subscribe qos level
     * @param {Function} [callback] - function(err, granted){} where:
     *    {Error} err - subscription error (none at the moment!)
     *    {Array} granted - array of {topic: 't', qos: 0}
     * @returns {MqttClient} this - for chaining
     * @api public
     * @example client.subscribe('topic');
     * @example client.subscribe('topic', {qos: 1});
     * @example client.subscribe({'topic': 0, 'topic2': 1}, console.log);
     * @example client.subscribe('topic', console.log);
     */
    subscribe(topic: string | string[], options: ClientSubscribeOptions, callback?: ClientSubscribeCallback): this;
    subscribe(topic: string | string[] | SubscriptionMap, callback?: ClientSubscribeCallback): this;
    /**
     * unsubscribe - unsubscribe from topic(s)
     *
     * @param {String, Array} topic - topics to unsubscribe from
     * @param {Function} [callback] - callback fired on unsuback
     * @returns {MqttClient} this - for chaining
     * @api public
     * @example client.unsubscribe('topic');
     * @example client.unsubscribe('topic', console.log);
     */
    unsubscribe(topic: string | string[], callback: PacketCallback): this;
    /**
     * end - close connection
     *
     * @returns {MqttClient} this - for chaining
     * @param {Boolean} force - do not wait for all in-flight messages to be acked
     * @param {Function} cb - called when the client has been closed
     *
     * @api public
     */
    end(force?: boolean, cb?: boolean): this;
    /**
     * _reconnect - implement reconnection
     * @api privateish
     */
    private _reconnect();
    /**
     * _setupReconnect - setup reconnect timer
     */
    private _setupReconnect();
    /**
     * _clearReconnect - clear the reconnect timer
     */
    private _clearReconnect();
    /**
     * _cleanUp - clean up on connection end
     * @api private
     */
    private _cleanUp(forced, done?);
    /**
     * _sendPacket - send or queue a packet
     * @param {String} type - packet type (see `protocol`)
     * @param {Object} packet - packet options
     * @param {Function} cb - callback when the packet is sent
     * @api private
     */
    private _sendPacket(packet, cb?);
    /**
     * _setupPingTimer - setup the ping timer
     *
     * @api private
     */
    private _setupPingTimer();
    /**
     * _shiftPingInterval - reschedule the ping interval
     *
     * @api private
     */
    private _shiftPingInterval();
    /**
     * _checkPing - check if a pingresp has come back, and ping the server again
     *
     * @api private
     */
    private _checkPing();
    /**
     * _handlePingresp - handle a pingresp
     *
     * @api private
     */
    private _handlePingresp(packet);
    /**
     * _handleConnack
     *
     * @param {Object} packet
     * @api private
     */
    private _handleConnack(packet);
    /**
     * _handlePublish
     *
     * @param {Object} packet
     * @api private
     */
    private _handlePublish(packet, done);
    /**
     * Handle messages with backpressure support, one at a time.
     * Override at will.
     *
     * @param Packet packet the packet
     * @param Function callback call when finished
     * @api public
     */
    handleMessage(packet: Packet, callback: PacketCallback): void;
    /**
     * _handleAck
     *
     * @param {Object} packet
     * @api private
     */
    private _handleAck(packet);
    /**
     * _handlePubrel
     *
     * @param {Object} packet
     * @api private
     */
    private _handlePubrel(packet, callback);
    /**
     * _nextId
     */
    private _nextId();
    /**
     * getLastMessageId
     */
    getLastMessageId(): number;
}
