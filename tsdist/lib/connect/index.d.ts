import { MqttClient, ClientOptions } from '../client';
declare const protocols: any;
/**
 * connect - connect to an MQTT broker.
 *
 * @param {String} [brokerUrl] - url of the broker, optional
 * @param {Object} opts - see MqttClient#constructor
 */
declare function connect(brokerUrl?: string | any, opts?: ClientOptions): MqttClient;
export { connect };
export { MqttClient };
export { protocols };
