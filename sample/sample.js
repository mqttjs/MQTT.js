import { connect } from '../dist/index.js'
import { URL } from 'url'
import { aedes } from 'aedes'
import { createServer } from 'net'
import { logger } from './src/util/logger'


const port = 1883
const broker = aedes()
const server = createServer(broker.handle)

await new Promise(resolve => server.listen(port, resolve))

logger.test(`server listening on port ${port}`)
broker.on('clientError', (client, err) => {
    logger.test('client error', client.id, err.message, err.stack)
})
broker.on('connectionError', (client, err) => {
    logger.test('connection error', client, err.message, err.stack)
})
broker.on('subscribe', (subscriptions, client) => {
    if (client) {
    logger.test(`subscribe from client: ${subscriptions}, ${client.id}`)
    }
})
broker.on('publish', (_packet, client) => {
    if (client) {
    logger.test(`message from client: ${client.id}`)
    }
})
broker.on('client', (client) => {
    logger.test(`new client: ${client.id}`)
})
broker.preConnect = (_client, packet, callback) => {
    broker.emit('connectReceived', packet)
    callback(null, true)
}


const client = await connect({ brokerUrl: new URL(`mqtt://test.mosquitto.org`)});
client.publish({topic: 'test', message: 'test'});
client.disconnect();
