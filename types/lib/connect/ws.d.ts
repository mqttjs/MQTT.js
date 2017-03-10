import { IClientOptions, MqttClient } from '../client'
export declare function buildBuilderNormal (client: MqttClient, opts: IClientOptions): any
export declare function buildBuilderBrowser (client: MqttClient, opts: IClientOptions): any
declare const buildBuilder: (typeof buildBuilderNormal)
export { buildBuilder }
