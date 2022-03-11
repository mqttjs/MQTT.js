/**
 * Generates client id with random 8 digit long base 16 value
 * @returns clientId
 */
export function defaultClientId(): string {
  return 'mqttjs_' + Math.random().toString(16).substr(2, 8);
}
