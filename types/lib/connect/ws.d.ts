import { MqttClient, ClientOptions } from '../client';
export declare function buildBuilderNormal(client: MqttClient, opts: ClientOptions): any;
export declare function buildBuilderBrowser(client: any, opts: any): any;
declare const buildBuilder: (typeof buildBuilderNormal);
export { buildBuilder };
