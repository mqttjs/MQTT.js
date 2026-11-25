import Aedes from 'aedes'
import http from 'http'
import { WebSocketServer, createWebSocketStream } from 'ws'

const aedes = Aedes()
const httpServer = http.createServer()
const wsPort = 8080

// Here we are creating the Websocket Server that is using the HTTP Server...
const wss = new WebSocketServer({ server: httpServer })
wss.on('connection', function connection (ws) {
  const duplex = createWebSocketStream(ws)
  aedes.handle(duplex)
})

httpServer.listen(wsPort, () => {
  console.log('websocket server listening on port', wsPort)
})

aedes.on('clientError', (client, err) => {
  console.log('client error', client.id, err.message, err.stack)
})

aedes.on('connectionError', (client, err) => {
  console.log('client error', client, err.message, err.stack)
})

aedes.on('publish', (packet, client) => {
  if (packet && packet.payload) {
    console.log('publish packet:', packet.payload.toString())
  }
  if (client) {
    console.log('message from client', client.id)
  }
})

aedes.on('subscribe', (subscriptions, client) => {
  if (client) {
    console.log('subscribe from client', subscriptions, client.id)
  }
})

aedes.on('client', (client) => {
  console.log('new client', client.id)
})
