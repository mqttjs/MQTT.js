import { QoS, UserProperties } from 'mqtt-packet';
import { Duplex } from 'stream';
import { TlsOptions } from 'tls';
import { WsOptions } from './wsOptions.js';

export interface ConnectOptions {
  objectMode?: any;
  autoUseTopicAlias?: any;
  autoAssignTopicAlias?: any;
  topicAliasMaximum?: number;
  queueLimit?: number;
  cmd?: 'connect';
  clientId?: string;
  protocolVersion?: 4 | 5 | 3;
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
  brokerUrl?: URL;
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
