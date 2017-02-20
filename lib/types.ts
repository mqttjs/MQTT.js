
/* --------------------------------- ADDONS --------------------------------- */

export type QoS = 0 | 1 | 2
export type PacketCmd = 'connack'
  | 'connect'
  | 'disconnect'
  | 'pingreq'
  | 'pingresp'
  | 'puback'
  | 'pubcomp'
  | 'publish'
  | 'pubrel'
  | 'pubrec'
  | 'suback'
  | 'subscribe'
  | 'unsuback'
  | 'unsubscribe'

export interface IPacket {
  cmd: PacketCmd
  messageId?: number
  // packet length
  length?: number,

}

export interface ConnectPacket extends IPacket {
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

export interface PublishPacket extends IPacket {
  cmd: 'publish'
  qos: QoS,
  dup: boolean,
  retain: boolean,
  topic: string,
  payload: string | Buffer
}

export interface ConnackPacket extends IPacket {
  cmd: 'connack'
  returnCode: number
  sessionPresent: boolean
}

export interface SubscribePacket extends IPacket {
  cmd: 'subscribe'
  subscriptions: Array<{
    topic: string
    qos: QoS
  }>
}

export interface SubackPacket extends IPacket {
  cmd: 'suback'
  granted: number[]
}

export interface UnsubscribePacket extends IPacket {
  cmd: 'unsubscribe'
  unsubscriptions: string[]
}

export interface UnsubackPacket extends IPacket {cmd: 'unsuback'}
export interface PubackPacket extends IPacket {cmd: 'puback'}
export interface PubcompPacket extends IPacket {cmd: 'pubcomp'}
export interface PubrelPacket extends IPacket {cmd: 'pubrel'}
export interface PubrecPacket extends IPacket {cmd: 'pubrec'}
export interface PingreqPacket extends IPacket {cmd: 'pingreq'}
export interface PingrespPacket extends IPacket {cmd: 'pingresp'}
export interface DisconnectPacket extends IPacket {cmd: 'disconnect'}

export type Packet = ConnectPacket
  | PublishPacket
  | ConnackPacket
  | SubscribePacket
  | SubackPacket
  | UnsubscribePacket
  | UnsubackPacket
  | PubackPacket
  | PubcompPacket
  | PubrelPacket
  | PingreqPacket
  | PingrespPacket
  | DisconnectPacket
  | PubrecPacket
