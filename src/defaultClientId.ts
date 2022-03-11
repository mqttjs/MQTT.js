export function defaultId() {
  return 'mqttjs_' + Math.random().toString(16).substr(2, 8);
}
