/// <reference types="node" />
export declare type QoS = 0 | 1 | 2
export declare type PacketCmd = 'connack' |
  'connect' |
  'disconnect' |
  'pingreq' |
  'pingresp' |
  'puback' |
  'pubcomp' |
  'publish' |
  'pubrel' |
  'pubrec' |
  'suback' |
  'subscribe' |
  'unsuback' |
  'unsubscribe'
export interface IPacket {
  cmd: PacketCmd
  messageId?: number
  length?: number
}
export interface IConnectPacket extends IPacket {
  cmd: 'connect'
  clientId: string
  protocolVersion?: 4 | 3
  protocolId?: 'MQTT' | 'MQIsdp'
  clean?: boolean
  keepalive?: number
  username?: string
  password?: Buffer
  will?: {
    topic: string
    payload: Buffer
    qos?: QoS
    retain?: boolean
  }
}
export interface IPublishPacket extends IPacket {
  cmd: 'publish'
  qos: QoS
  dup: boolean
  retain: boolean
  topic: string
  payload: string | Buffer
}
export interface IConnackPacket extends IPacket {
  cmd: 'connack'
  returnCode: number
  sessionPresent: boolean
}
export interface ISubscribePacket extends IPacket {
  cmd: 'subscribe'
  subscriptions: Array<{
    topic: string
    qos: QoS
  }>
}
export interface ISubackPacket extends IPacket {
  cmd: 'suback'
  granted: number[]
}
export interface IUnsubscribePacket extends IPacket {
  cmd: 'unsubscribe'
  unsubscriptions: string[]
}
export interface IUnsubackPacket extends IPacket {
  cmd: 'unsuback'
}
export interface IPubackPacket extends IPacket {
  cmd: 'puback'
}
export interface IPubcompPacket extends IPacket {
  cmd: 'pubcomp'
}
export interface IPubrelPacket extends IPacket {
  cmd: 'pubrel'
}
export interface IPubrecPacket extends IPacket {
  cmd: 'pubrec'
}
export interface IPingreqPacket extends IPacket {
  cmd: 'pingreq'
}
export interface IPingrespPacket extends IPacket {
  cmd: 'pingresp'
}
export interface IDisconnectPacket extends IPacket {
  cmd: 'disconnect'
}

export declare type Packet = IConnectPacket |
  IPublishPacket |
  IConnackPacket |
  ISubscribePacket |
  ISubackPacket |
  IUnsubscribePacket |
  IUnsubackPacket |
  IPubackPacket |
  IPubcompPacket |
  IPubrelPacket |
  IPingreqPacket |
  IPingrespPacket |
  IDisconnectPacket |
  IPubrecPacket
