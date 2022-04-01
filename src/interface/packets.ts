export declare type QoS = 0 | 1 | 2;

export declare type UserProperties = { [index: string]: string | string[] };

// TODO: Do we want to define our own interface or rely on the ones from mqtt-packet?
export interface PublishPacket {
  qos?: QoS;
  dup?: boolean;
  retain?: boolean;
  topic: string;
  payload: string | Buffer;
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
}
