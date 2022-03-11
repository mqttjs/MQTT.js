export declare type QoS = 0 | 1 | 2;

export declare type UserProperties = { [index: string]: string | string[] };

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
