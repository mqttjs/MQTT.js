import test from 'ava'
import { logger } from '../dist/utils/logger.js'
import { serverFactoryMacro, cleanupAfterAllTestsMacro, cleanupBetweenTestsMacro } from './util/testing_server_factory.js'
import { connect } from '../dist/index.js'

const port = 1886

/* ===================== BEGIN before/beforeEach HOOKS ===================== */
test.before('set up aedes broker', serverFactoryMacro, port)
/* ====================== END before/beforeEach HOOKS ====================== */

/* ============================== BEGIN TESTS ============================== */

test.only('publish QoS 0', async (t) => {
    const connectReceivedListener = (packet) => {
        logger.test(`connect received: ${packet}`)
        t.context.broker.removeListener('connectReceived', connectReceivedListener)
      }
      t.context.broker.on('connectReceived', connectReceivedListener)
    const client = await connect({ brokerUrl: `mqtt://localhost:${port}`})
    await client.publish({topic: 'fakeTopic', message: 'fakeMessage'});
    await client.disconnect();
})

/* =============================== END TESTS =============================== */


/* ====================== BEGIN after/afterEach HOOKS ====================== */
test.afterEach.always(cleanupBetweenTestsMacro)

test.after.always(cleanupAfterAllTestsMacro)
/* ======================= END after/afterEach HOOKS ======================= */