import { MqttClient } from './client'
import { Store } from './store'
import { QoS } from './types'

export interface IClientOptions extends ISecureClientOptions {
  // The options are extended by url.parse() fields in connect() function
  port?: number // port is made into a number subsequently
  host?: string // host does NOT include port
  path?: string
  protocol?: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl'

  wsOptions?: {
    [x: string]: any;
  }
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
    host: string;
    port: number;
  }>
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
  }
  transformWsUrl?: (url: string, options: IClientOptions, client: MqttClient) => string
}
export interface ISecureClientOptions {
  /**
   * path to private key
   */
  key?: string
  /**
   * path to corresponding public cert
   */
  cert?: string
  ca?: string
  rejectUnauthorized?: boolean
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
}
export interface IClientSubscribeOptions {
  /**
   * the QoS
   */
  qos?: QoS
}
