import { IClientOptions, MqttClient } from '../client'

/**
 * connect - connect to an MQTT broker.
 *
 * @param {Object} opts - see MqttClient#constructor
 */
declare function connect (opts: IClientOptions): MqttClient

/**
 * connect - connect to an MQTT broker.
 *
 * @param {String} brokerUrl - url of the broker
 * @param {Object} opts - see MqttClient#constructor
 */
declare function connect (brokerUrl: string, opts?: IClientOptions): MqttClient

export { connect }
export { MqttClient }
