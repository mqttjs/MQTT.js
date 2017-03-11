/// <reference types="node" />
import { IClientOptions, MqttClient } from '../client'
import tls = require('tls')
declare function buildBuilder (mqttClient: MqttClient, opts: IClientOptions): tls.ClearTextStream
export { buildBuilder }
