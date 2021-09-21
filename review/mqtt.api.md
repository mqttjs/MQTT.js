## API Report File for "mqtt"

```ts

import { OperationOptions } from '@azure/core-client';

export function connect(options: connectOptions): MqttClient

export interface connectOptions {
  wsOptions: BestGuessWebsocketOptions // Websockets
  keepalive: number,
  reschedulePings: boolean,
  clientId: string
  protocolId: string // Is this just MQTT or MQTTv3
  protocolVersion: number // There's only a limited number of protocols supported
  reconnectPeriod: number,
  connectTimeout: number,
  username: string,
  password: string,
  incomingStore: Store,
  outgoingStore: Store,
  queueQoSZero: boolean,
  customHandleAcks: (topic: string, message: unknown, packet: unknown): Promise<{}>
  properties: {
    sessionExpiryInterval: number,
    receiveMaximum: number,
    maximumPacketSize: number,
    topicAliasMaximum: number,
    requestResponseInformation: boolean,
    requestProblemInformation: boolean,
    userProperties: unknown,
    authenticationMethod: string,
    authenticationData: binary
  }
  authPacket: unknown,
  will: {
    topic: string,
    payload: unknown,
    qos: number,
    retain: unknown,
    properties: {
      willDelayInterval: number,
      payloadFormatIndicator: boolean,
      messageExpiryInterval: number,
      contentType: string,
      responseTopic: string,
      correlationData: binary,
      userProperties: unknown
    }
  },
  transformWsUrl: (url, options, client) => string
  resubscribe: boolean,
  messageIdProvider: unknown
}

// @public
export interface MqttClient {
    connected: boolean;
    reconnecting: boolean;
    async publish(topic: string, message: buffer | string, options?: publishOptions): Promise<{err ?: Error}>
    subscribe(topic: string | Array<string> | TopicMap, options ?: subscribeOptions): Promise<{err: Error, granted: Array<topic: string, qos: number>}>
    unsubscribe(topic: string | Array<string>, options?: unsubscribeOptions): Promise<{err: Error}>
    end(force?: boolean, options?: disconnectOptions): Promise<{}>
    removeOutgoingMessage(mId: number): void
    reconnect(): void
    handleMessage(): Promise<{}>
    getLastMessageId(): number
}

// @public
export interface MqttStore {
    put(packet: MqttPacket): Promise<{void}>
    createStream(): Stream
    del(packet: MqttPacket): Promise<{void}>
    close(): Promise<{void}>
}
```
