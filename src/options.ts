'use strict';
import { MessageIdProvider } from './message-id-provider';
import { Packet } from 'mqtt-packet';
import Store from './store';
import MqttClient from './client';

export interface Server {
  host?: string;
  port?: number;
  protocol?: string;
}

export type CustomHandleAckFunction = (
  topic: string,
  message: any,
  packet: Packet,
  cb: (err?: Error, code?: number) => void
) => void;

export interface MqttClientOptions {
  hostname?: string;
  host?: string;
  path?: string;
  username?: string;
  password?: string;
  wsOptions?: any;
  transformWsUrl?: (url: string, opts: MqttClientOptions, client: MqttClient) => string;
  protocol?: string;
  port?: number;
  protocolId?: string;
  protocolVersion?: number;
  my?: any;
  auth?: string;
  query?: { [key: string]: string }; // querystring from parsed URL.
  cert?: any;
  key?: any;
  clientId?: string;
  clean?: boolean;
  defaultProtocol?: string;
  servers?: Server[];
  keepalive?: number;
  reschedulePings?: boolean;
  reconnectPeriod?: number;
  connectTimeout?: number;
  resubscribe?: boolean;
  autoAssignTopicAlias?: boolean;
  autoUseTopicAlias?: boolean;
  customHandleAcks?: CustomHandleAckFunction;
  messageIdProvider?: MessageIdProvider;
  rejectUnauthorized?: boolean;
  outgoingStore?: Store;
  incomingStore?: Store;
  queueQoSZero?: boolean;
  properties?: {
    authenticationMethod?: boolean; // TODO: why a sub-object
    authenticationData?: any;
    maximumPacketSize?: number;
  };
  topicAliasMaximum?: number;
  authPacket?: any;
  objectMode?: boolean;
  binary?: boolean;
  browserBufferSize?: number;
  browserBufferTimeout?: number;
}
