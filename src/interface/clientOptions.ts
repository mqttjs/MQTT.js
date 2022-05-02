export interface ClientOptions {
  /**
   * MQTT protocol version to use. Use 4 for vMQTT 3.1.1, and 5 for MQTT v5.0
   * Default: 5
   */
  protocolVersion?: 4 | 5;
}