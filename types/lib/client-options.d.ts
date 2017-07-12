import { MqttClient } from './client'
import { Store } from './store'
import { QoS } from './types'

export interface IClientOptions extends ISecureClientOptions {
  port?: number // port is made into a number subsequently
  host?: string // host does NOT include port
  hostname?: string
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
}
export interface IClientPublishOptions {
  /**
   * the QoS
   */
  qos: QoS
  /**
   * the retain flag
   */
  retain?: boolean
  /**
   * whether or not mark a message as duplicate
   */
  dup?: boolean
}
export interface IClientSubscribeOptions {
  /**
   * the QoS
   */
  qos: QoS
}
