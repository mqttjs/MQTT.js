import test from 'ava'
import aedes from 'aedes'
import { createServer } from 'node:net'
import { connect } from '../dist/index.js'
import { logger } from '../dist/utils/logger.js'

const testPort = 1885

/* ===================== BEGIN before/beforeEach HOOKS ===================== */
test.before('set up aedes broker', async t => {
  t.context.broker = aedes()
  t.context.server = createServer(t.context.broker.handle)

  await new Promise(resolve => t.context.server.listen(testPort, resolve))

  logger.test(`server listening on port ${testPort}`)
  t.context.broker.on('clientError', (client, err) => {
    logger.test('client error', client.id, err.message, err.stack)
  })
  t.context.broker.on('connectionError', (client, err) => {
    logger.test('connection error', client, err.message, err.stack)
  })
  t.context.broker.on('publish', (_packet, client) => {
    if (client) {
      logger.test('message from client', client.id)
    }
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
/* ====================== END before/beforeEach HOOKS ====================== */


/* ============================== BEGIN TESTS ============================== */
/* NOTE: Use unique clientId to de-conflict tests since they run in parallel */

test.only('should emit close if stream closes', async t => {
  const connectReceivedListener = async (packet) => {
    logger.test(`connectReceivedListener called with packet ${packet}`)
    t.context.broker.removeListener('connectReceived', connectReceivedListener)
  }
  t.context.broker.on('connectReceived', connectReceivedListener)

  const client = await connect({ brokerUrl: `mqtt://localhost:${testPort}` })
  logger.test(`client connected. disconnecting...`)
  t.context.broker.on('clientDisconnect', (client) => {
    logger.test(`client ${client.id} is disconnected.`)
  })
  await client.disconnect()
  await new Promise((resolve, reject) => {
    try {
      client.conn.write('', (e) => {
        t.assert(e.code === 'ERR_STREAM_WRITE_AFTER_END')
        resolve()
      })
    } catch (e) {
      logger.test(e)
      reject(e)
    }
  })
})
test.todo('should mark the client as disconnected')
test.todo('should stop ping timer if stream closes')
test.todo('should emit close after end called')
test.todo('should emit end after end classed and client must be disconnected')
test.todo('should pass store close error to end callback but not to end listeners (incomingStore)')
test.todo('should pass store close error to end callback but not to end listeners (outgoingStore)')
test.todo('should emit end only once')
test.todo('should stop ping timer after end called')

/* TODO: Stub out more tests */

/* =============================== END TESTS =============================== */


/* ====================== BEGIN after/afterEach HOOKS ====================== */
test.afterEach.always((t) => {
	t.context.broker?.removeAllListeners?.('connectReceived')
  t.context.client?.end?.()
  t.context.client = null
})

test.after.always(async (t) => {
  t.context.server?.unref?.()
  await new Promise((resolve) => {
    if (!t.context.broker?.close) {
      resolve()
      return
    }
    t.context.broker.close(resolve)
  })
})
/* ======================= END after/afterEach HOOKS ======================= */