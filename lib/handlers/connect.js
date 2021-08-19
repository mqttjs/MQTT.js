
export async function handleConnect (client, packet) {
  client.connecting = true
  // Connection logic
  return true
}
