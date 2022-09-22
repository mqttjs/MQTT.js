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

export interface MqttClientOptions {
  hostname?: string;
  host?: string;
  path?: string;
  username?: string;
  password?: string;
  wsOptions?: any; // TODO: type
  transformWsUrl?: (url: string, opts: MqttClientOptions, client: MqttClient) => string;
  protocol?: string;
  port?: number;
  protocolId?: string;
  protocolVersion?: number;
  my?: any; // TODO: this is ali only, right? Maybe add {[key: string]: string}
  auth?: string;
  query?: { [key: string]: string }; // querystring from parsed URL.
  cert?: any; // TODO: type
  key?: any; // TODO: type
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
  // TODO: type for "code" parameter in customHandleAck. Also for message parameter
  customHandleAcks?: (topic: string, message: any, packet: Packet, cb: (err?: Error, code?: any) => void) => void;
  messageIdProvider?: MessageIdProvider;
  rejectUnauthorized?: boolean;
  outgoingStore?: Store;
  incomingStore?: Store;
  queueQoSZero?: boolean;
  properties?: {
    authenticationMethod?: boolean; // TODO: why a sub-object
    authenticationData?: any; // TODO: type
    maximumPacketSize?: number;
  };
  topicAliasMaximum?: number;
  authPacket?: any; // TODO: type
  objectMode?: boolean; // TODO: websocket only?
  binary?: boolean; // TODO: websocket only?
  browserBufferSize?: number; // TODO: websocket only
  browserBufferTimeout?: number; // TODO: websocket only
}
