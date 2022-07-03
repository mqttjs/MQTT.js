import { MqttClient } from './client'
import { Store } from './store'
import { ClientOptions } from 'ws'
import { ClientRequestArgs } from 'http'
import { QoS, UserProperties } from 'mqtt-packet'
import { IMessageIdProvider } from './message-id-provider'

export declare type StorePutCallback = () => void

export interface IClientOptions extends ISecureClientOptions {
  port?: number // port is made into a number subsequently
  host?: string // host does NOT include port
  hostname?: string
  path?: string
  protocol?: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs'

  wsOptions?: ClientOptions | ClientRequestArgs
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
   * 1000 milliseconds, interval between two re-connections
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
  password?: string
  /**
   * a Store for the incoming packets
   */
  incomingStore?: Store
  /**
   * a Store for the outgoing packets
   */
  outgoingStore?: Store
  queueQoSZero?: boolean
  reschedulePings?: boolean
  servers?: Array<{
    host: string
    port: number
    protocol?: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs'
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
    retain: boolean,
    /**
     * Properties object of will by MQTT 5.0.
     */
    properties?: {
      /**
       * Representing the Will Delay Interval in seconds.
       * @type {number}
       */
      willDelayInterval?: number,
      /**
       * Will Message is UTF-8 Encoded Character Data or not.
       * @type {boolean}
       */
      payloadFormatIndicator?: boolean,
      /**
       * Value is the lifetime of the Will Message in seconds and is sent as the Publication Expiry Interval when the Server publishes the Will Message.
       * @type {number}
       */
      messageExpiryInterval?: number,
      /**
       * Describing the content of the Will Message.
       * @type {string}
       */
      contentType?: string,
      /**
       * String which is used as the Topic Name for a response message
       * @type {string}
       */
      responseTopic?: string,
      /**
       * The Correlation Data is used by the sender of the Request Message to identify which request the Response Message is for when it is received.
       * @type {Buffer}
       */
      correlationData?: Buffer,
      /**
       * The User Property is allowed to appear multiple times to represent multiple name, value pairs. 
       */
      userProperties?: UserProperties
    }
  }
  /**
   * A Function For ws/wss protocols only. Can be used to implement signing urls which upon reconnect can have become expired.
   */
  transformWsUrl?: (url: string, options: IClientOptions, client: MqttClient) => string,
  /**
   * Properties MQTT 5.0.
   * @type {object}
   */
  properties?: {
    /**
     * Representing the Session Expiry Interval in seconds.
     * @type {number}
     */
    sessionExpiryInterval?: number,
    /**
     * Representing the Receive Maximum value.
     * @type {number}
     */
    receiveMaximum?: number,
    /**
     * Representing the Maximum Packet Size the Client is willing to accept.
     * @type {number}
     */
    maximumPacketSize?: number,
    /**
     * Representing the Topic Alias Maximum value indicates the highest value that
     * the Client will accept as a Topic Alias sent by the Server.
     * @type {number}
     */
    topicAliasMaximum?: number,
    /**
     * The Client uses this value to request the Server to return Response Information in the CONNACK.
     * @type {boolean}
     */
    requestResponseInformation?: boolean,
    /**
     * The Client uses this value to indicate whether the Reason String or User Properties are sent
     * in the case of failures.
     * @type {boolean}
     */
    requestProblemInformation?: boolean,
    /**
     * The User Property is allowed to appear multiple times to represent multiple name, value pairs.
     * @type {object}
     */
    userProperties?: UserProperties,
    /**
     * The name of the authentication method used for extended authentication.
     * @type {string}
     */
    authenticationMethod?: string,
    /**
     * Binary Data containing authentication data.
     * @type {Buffer}
     */
    authenticationData?: Buffer
  },
  /**
   * Custom messageId provider. when new UniqueMessageIdProvider() is set, then non conflict messageId is provided.
   */
  messageIdProvider?: IMessageIdProvider
}
export interface ISecureClientOptions {
  /**
   * optional private keys in PEM format
   */
  key?: string | string[] | Buffer | Buffer[] | Object[]
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
  /**
   *  MQTT 5.0 properties object
   */
  properties?: {
    /**
     * Payload is UTF-8 Encoded Character Data or not.
     * @type {boolean}
     */
    payloadFormatIndicator?: boolean,
    /**
     * The lifetime of the Application Message in seconds.
     * @type {number}
     */
    messageExpiryInterval?: number,
    /**
     * Value that is used to identify the Topic instead of using the Topic Name.
     * @type {number}
     */
    topicAlias?: number,
    /**
     * String which is used as the Topic Name for a response message
     * @type {string}
     */
    responseTopic?: string,
    /**
     * Used by the sender of the Request Message to identify which request the Response Message is for when it is received.
     * @type {Buffer}
     */
    correlationData?: Buffer,
    /**
     * The User Property is allowed to appear multiple times to represent multiple name, value pairs.
     * @type {object}
     */
    userProperties?: UserProperties,
    /**
     * Representing the identifier of the subscription.
     * @type {number}
     */
    subscriptionIdentifier?: number,
    /**
     * String describing the content of the Application Message.
     * @type {string}
     */
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
  qos: QoS,
  /**
  * no local flag
  */
  nl?: boolean,
  /**
  * Retain As Published flag
  */
  rap?: boolean,
  /**
  * Retain Handling option
  */
  rh?: number,
  /**
  * MQTT 5.0 properties object of subscribe
  */
  properties?: {
    /**
     * Representing the identifier of the subscription.
     * @type {number}
     */
    subscriptionIdentifier?: number,
    /**
     * The User Property is allowed to appear multiple times to represent multiple name, value pairs.
     * @type {object}
     */
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
