import test from 'ava'
import { connect } from '../dist/index.js'
import { logger } from '../dist/utils/logger.js'
import { cleanupAfterAllTestsMacro, cleanupBetweenTestsMacro, serverFactoryMacro } from './util/testing_server_factory.js'
import { uniquePort } from './util/generate_unique_port_number.js'
const port = 1883
/* ===================== BEGIN before/beforeEach HOOKS ===================== */
test.before('set up aedes broker', serverFactoryMacro, port)
/* ====================== END before/beforeEach HOOKS ====================== */


/* ============================== BEGIN TESTS ============================== */
/* NOTE: Use unique clientId to de-conflict tests since they run in parallel */

test('should disconnect and clean up connection stream', async t => {
  const connectReceivedListener = async (packet) => {
    logger.test(`connectReceivedListener called with packet ${packet}`)
    t.context.broker.removeListener('connectReceived', connectReceivedListener)
  }
  t.context.broker.on('connectReceived', connectReceivedListener)

  const client = await connect({ brokerUrl: `mqtt://localhost:${port}` })
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
test.afterEach.always(cleanupBetweenTestsMacro)

test.after.always(cleanupAfterAllTestsMacro)
/* ======================= END after/afterEach HOOKS ======================= */