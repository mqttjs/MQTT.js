/// <reference types="node" />
import * as net from 'net';
import { MqttClient, ClientOptions } from '../client';
declare function buildBuilder(client: MqttClient, opts: ClientOptions): net.Socket;
export = buildBuilder;
