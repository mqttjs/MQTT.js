import test from 'ava'
import aedes from 'aedes'
import { createServer } from 'node:net'
import { logger } from '../../dist/utils/logger.js'


/* ===================== BEGIN before/beforeEach HOOKS ===================== */
export const serverFactoryMacro = test.macro(async (t, port) => {
    t.context.broker = aedes()
    t.context.server = createServer(t.context.broker.handle)

    await new Promise(resolve => t.context.server.listen(port, resolve))

    logger.test(`server listening on port ${port}`)
    t.context.broker.on('clientError', (client, err) => {
        logger.test('client error', client.id, err.message, err.stack)
    })
    t.context.broker.on('connectionError', (client, err) => {
        logger.test('connection error', client, err.message, err.stack)
    })
    t.context.broker.on('subscribe', (subscriptions, client) => {
        if (client) {
        logger.test(`subscribe from client: ${subscriptions}, ${client.id}`)
        }
    })
    t.context.broker.on('publish', (_packet, client) => {
        if (client) {
        logger.test(`message from client: ${client.id}`)
        }
    })
    t.context.broker.on('client', (client) => {
        logger.test(`new client: ${client.id}`)
    })
    t.context.broker.preConnect = (_client, packet, callback) => {
        t.context.broker.emit('connectReceived', packet)
        callback(null, true)
    }
})

export const cleanupBetweenTestsMacro = test.macro((t) => {
    t.context.broker?.removeAllListeners?.('connectReceived')
    t.context.client?.disconnect?.({force: false})
    t.context.client = null
})

export const cleanupAfterAllTestsMacro = test.macro(async (t) => {
    t.context.server?.unref?.()
    await new Promise((resolve) => {
        if (!t.context.broker?.close) {
        resolve()
        return
        }
        t.context.broker.close(resolve)
    })
})