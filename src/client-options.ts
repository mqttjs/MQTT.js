'use strict';
import { MqttClient } from './client';
import { Store } from './store';
import { DuplexOptions } from 'stream';
import { ClientOptions } from 'ws';
import { ClientRequestArgs } from 'http';
import { QoS, UserProperties } from 'mqtt-packet';
import { IMessageIdProvider } from './message-id-provider';
import { Packet } from 'mqtt-packet';
import { KeyObject } from 'tls';

export type CustomHandleAckFunction = (
  topic: string,
  message: any,
  packet: Packet,
  cb: (err?: Error, code?: number) => void
) => void;

export type StorePutCompleteCallback = (err?: Error) => void;
export type SendPacketCompleteCallback = (err?: Error) => void;

export interface IClientOptions extends ISecureClientOptions {
  port?: number; // port is made into a number subsequently
  host?: string; // host does NOT include port
  hostname?: string;
  path?: string;
  protocol?: string;

  wsOptions?: ClientOptions | ClientRequestArgs | DuplexOptions;
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
    port: number;
    protocol?: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs';
  }>;
  /**
   * true, set to false to disable re-subscribe functionality
   */
  resubscribe?: boolean;
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
    payload: Buffer | string;
    /**
     * the QoS
     */
    qos: QoS;
    /**
     * the retain flag
     */
    retain: boolean;
    /*
     *  properies object of will
     * */
    properties?: {
      willDelayInterval?: number;
      payloadFormatIndicator?: boolean;
      messageExpiryInterval?: number;
      contentType?: string;
      responseTopic?: string;
      correlationData?: Buffer;
      userProperties?: UserProperties;
    };
  };
  transformWsUrl?: (url: string, options: IClientOptions, client: MqttClient) => string;
  properties?: {
    sessionExpiryInterval?: number;
    receiveMaximum?: number;
    maximumPacketSize?: number;
    topicAliasMaximum?: number;
    requestResponseInformation?: boolean;
    requestProblemInformation?: boolean;
    userProperties?: UserProperties;
    authenticationMethod?: string;
    authenticationData?: Buffer;
  };
  messageIdProvider?: IMessageIdProvider;

  // Used but not included in old options definitions
  autoAssignTopicAlias?: boolean;
  topicAliasMaximum?: number;
  autoUseTopicAlias?: boolean;
  customHandleAcks?: CustomHandleAckFunction;
  authPacket?: any;
  auth?: string;
  query?: { [key: string]: string }; // querystring from parsed URL.
  objectMode?: boolean;
  binary?: boolean;
  browserBufferSize?: number;
  browserBufferTimeout?: number;
  defaultProtocol?: string;
}
export interface ISecureClientOptions {
  /**
   * optional private keys in PEM format
   */
  key?: string | Buffer | (Buffer | KeyObject)[];
  /**
   * optional cert chains in PEM format
   */
  cert?: string | string[] | Buffer | Buffer[];
  /**
   * Optionally override the trusted CA certificates in PEM format
   */
  ca?: string | string[] | Buffer | Buffer[];
  rejectUnauthorized?: boolean;
  /**
   * optional alpn's
   */
  ALPNProtocols?: string[] | Buffer[] | Uint8Array[] | Buffer | Uint8Array;
}
export interface IClientPublishOptions {
  /**
   * the QoS
   */
  qos?: QoS;
  /**
   * the retain flag
   */
  retain?: boolean;
  /**
   * whether or not mark a message as duplicate
   */
  dup?: boolean;
  /*
   *  MQTT 5.0 properties object
   */
  properties?: {
    payloadFormatIndicator?: boolean;
    messageExpiryInterval?: number;
    topicAlias?: number;
    responseTopic?: string;
    correlationData?: Buffer;
    userProperties?: UserProperties;
    subscriptionIdentifier?: number;
    contentType?: string;
  };
  /**
   * callback called when message is put into `outgoingStore`
   */
  cbStorePut?: StorePutCompleteCallback;
}
export interface IClientSubscribeOptions {
  /**
   * the QoS
   */
  qos: QoS;
  /*
   * no local flag
   */
  nl?: boolean;
  /*
   * Retain As Published flag
   */
  rap?: boolean;
  /*
   * Retain Handling option
   */
  rh?: number;
  /*
   *  MQTT 5.0 properies object of subscribe
   */
  properties?: {
    subscriptionIdentifier?: number;
    userProperties?: UserProperties;
  };
}

export interface IClientReconnectOptions {
  /**
   * a Store for the incoming packets
   */
  incomingStore?: Store;
  /**
   * a Store for the outgoing packets
   */
  outgoingStore?: Store;
}
