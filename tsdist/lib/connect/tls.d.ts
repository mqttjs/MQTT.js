/// <reference types="node" />
import * as tls from 'tls';
import { MqttClient, ClientOptions } from '../client';
declare function buildBuilder(mqttClient: MqttClient, opts: ClientOptions): tls.ClearTextStream;
export = buildBuilder;
