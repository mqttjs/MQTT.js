/// <reference types="node" />
import { MqttClient, ClientOptions } from '../client';
import tls = require('tls');
declare function buildBuilder(mqttClient: MqttClient, opts: ClientOptions): tls.ClearTextStream;
export { buildBuilder };
