import test from 'ava'
import { logger } from '../dist/utils/logger.js'
import { serverFactoryMacro, cleanupAfterAllTestsMacro, cleanupBetweenTestsMacro } from './util/testing_server_factory.js'
import { connect } from '../dist/index.js'

const port = 1887

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

test('should checkPing at keepalive interval', (t) => {
    const client = connect({ keepalive: 3 })

    client._checkPing = sinon.spy()

    client.once('connect', function () {
      clock.tick(interval * 1000)
      assert.strictEqual(client._checkPing.callCount, 1)

      clock.tick(interval * 1000)
      assert.strictEqual(client._checkPing.callCount, 2)

      clock.tick(interval * 1000)
      assert.strictEqual(client._checkPing.callCount, 3)

      client.end(true, done)
    })
  })

/* =============================== END TESTS =============================== */


/* ====================== BEGIN after/afterEach HOOKS ====================== */
test.afterEach.always(cleanupBetweenTestsMacro)

test.after.always(cleanupAfterAllTestsMacro)
/* ======================= END after/afterEach HOOKS ======================= */