/// <reference types="node" />
/**
 * Module dependencies
 */
import * as events from 'events';
import { Store } from './store';
import { Packet, QoS } from './types';
import { ClientOptions, ClientPublishOptions, ClientSubscribeOptions } from './client-options';
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
export declare type ClientSubscribeCallback = (err: Error, granted: SubscriptionGrant[]) => void;
export declare type OnMessageCallback = (topic: string, payload: Buffer, packet: Packet) => void;
export declare type OnPacketCallback = (packet: Packet) => void;
export declare type OnErrorCallback = (error: Error) => void;
export declare type PacketCallback = (error?: Error, packet?: Packet) => any;
export interface IReinterval {
    clear: () => void;
    reschedule(ms: number): any;
}
export interface IStream extends events.EventEmitter {
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
    connected: boolean;
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
    on(event: string, cb: Function): this;
    once(event: 'message', cb: OnMessageCallback): this;
    once(event: 'packetsend' | 'packetreceive', cb: OnPacketCallback): this;
    once(event: 'error', cb: OnErrorCallback): this;
    once(event: string, cb: Function): this;
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
    subscribe(topic: string | string[], opts: ClientSubscribeOptions, callback?: ClientSubscribeCallback): this;
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
     * @param packet packet the packet
     * @param callback callback call when finished
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
     * @param callback
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
export { ClientOptions };
