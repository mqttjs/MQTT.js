import { QoS, UserProperties } from 'mqtt-packet';
import { Duplex } from 'stream';
import { TlsOptions } from 'tls';
import { WsOptions } from './wsOptions.js';

/**
 * User-facing options for connect() method
 */
export interface ConnectOptions {
  /**
   * The URL of the MQTT broker to connect to in the following format:
   * <mqtt, mqtts>://<hostname>:<port>
   * If the port is omitted, it will be set to 1883 for mqtt and 8883 for mqtts.
   * Default: 'mqtt://localhost'
   */
  brokerUrl?: string | URL;

  /**
   * The MQTT protocol level to use. Use 4 for MQTT v3.1.1 and 5 for MQTT v5.0
   * Default: 4
   */
  protocolVersion?: 4 | 5;

  /**
   * The client ID to use. If not provided, one will be generated.
   */
  clientId?: string;

  /**
   * The value of the Clean Session/Clean Start flag. If true, the client will
   * will connect with a brand new session. If false, the client attempt to
   * resume a session if one exists on the server.
   * Default: true
   */
  clean?: boolean;

  /**
   * The keep alive value, in seconds. Set to 0 to disable.
   * Default: 60
   */
  keepalive?: number;

  /**
   * The username to use to authenticate with the server.
   */
  username?: string;

  /**
   * The password to use to authenticate with the server. 
   */
  password?: Buffer;


  objectMode?: any;
  autoUseTopicAlias?: any;
  autoAssignTopicAlias?: any;
  topicAliasMaximum?: number;
  queueLimit?: number;
  will?: {
    topic: string;
    payload: Buffer;
    qos?: QoS;
    retain?: boolean;
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
  wsOptions?: { [key: string]: WsOptions | unknown };
  tlsOptions?: { [key: string]: TlsOptions | unknown };
  reschedulePings?: any;
  reconnectPeriod?: any;
  connectTimeout?: any;
  incomingStore?: any;
  outgoingStore?: any;
  queueQoSZero?: any;
  customHandleAcks?: any;
  authPacket?: any;
  transformWsUrl?: (options: any) => URL;
  resubscribe?: boolean;
  customStreamFactory?: (options: ConnectOptions) => Duplex;
}
