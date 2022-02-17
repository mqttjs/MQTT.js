import test from 'ava'
import aedes from 'aedes'
import { createServer } from 'node:net'
import { connect } from '../dist/index.js'
import { logger } from '../dist/utils/logger.js'

/* ===================== BEGIN before/beforeEach HOOKS ===================== */
test.before('set up aedes broker', async t => {
  t.context.broker = aedes()
  t.context.server = createServer(t.context.broker.handle)

  await new Promise(resolve => t.context.server.listen(1883, resolve))

  logger.test('server listening on port 1883')
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
test('should send a CONNECT packet with the correct default parameters', async (t) => {
  t.plan(7)

  const clientConnectedPromise = new Promise((resolve) => {
    const connectReceivedListener = (packet) => {
      /* Ensure default mqttjs client ID is used */
      if (!packet.clientId.startsWith('mqttjs_')) return

      t.context.broker.removeListener('connectReceived', connectReceivedListener)
      
      /* Ensure default options are used in connect packet */
      t.falsy(packet.will)
      t.falsy(packet.username)
      t.falsy(packet.password)
      t.true(packet.clean)
      t.is(packet.keepalive, 60)
      t.is(packet.protocolVersion, 4)
      t.is(packet.protocolId, 'MQTT')
      
      resolve()
    }
    t.context.broker.on('connectReceived', connectReceivedListener)
  })
  t.context.client = await connect({ brokerUrl: 'mqtt://localhost' })
  await clientConnectedPromise
})

test.todo('should send a CONNECT packet with a user-provided client ID')
test.todo('should send a CONNECT packet with a user-provided protocol level')
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