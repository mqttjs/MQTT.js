import { ConnectOptions } from '../interface/connectOptions.js';

export const defaultConnectOptions: ConnectOptions = {
  keepalive: 60,
  reschedulePings: true,
  protocolId: 'MQTT',
  protocolVersion: 4,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  clean: true,
  resubscribe: true,
};

export const protocols = {
  all: ['mqtt', 'mqtts', 'ws', 'wss'],
  secure: ['mqtts', 'ws'],
  insecure: ['mqtt', 'wss'],
};
