export async function handleDisconnect (client) {
  client.emit('disconnect', packet)
}
