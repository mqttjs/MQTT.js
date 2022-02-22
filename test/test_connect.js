import test from 'ava'
import aedes from 'aedes'
import { createServer } from 'node:net'
import { connect } from '../dist/index.js'
import { logger } from '../dist/utils/logger.js'
import { serverFactoryMacro, cleanupAfterAllTestsMacro, cleanupBetweenTestsMacro } from './util/testing_server_factory.js'
import { uniquePort } from './util/generate_unique_port_number.js'

const port = 1884

/* ===================== BEGIN before/beforeEach HOOKS ===================== */
test.before('set up aedes broker', serverFactoryMacro, port)
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
  t.context.client = await connect({ brokerUrl: `mqtt://localhost:${port}` })
  await clientConnectedPromise
})

test.todo('should send a CONNECT packet with a user-provided client ID')
test.todo('should send a CONNECT packet with a user-provided protocol level')
test.todo('should send a DISCONNECT packet when closing client')
test.todo('can send a PINGREQ at any time')
test.todo('should close the network connection to the server if client does not receive PINGRESP within a reasonable amount of time')
test.todo('a keepalive of zero (0) has the effect of turning off the keepalive mechanism')
test.todo('user can specify value of keepalive')
test.todo('maximum value of keepalive is 18 hours, 12 minutes and 15 seconds')
test.todo('the client identifier (clientId) must be present')
test.todo('a clientId must be between 1 and 23 UTF-8 encoded bytest in length and contain only the characters "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"')
test.todo('user can use convenience method to generate a random clientId')
test.todo('user cannot use random clientId if cleanSession is set to 0')
test.todo('the first packet sent from the server MUST be a CONNACK packet')
test.todo('handle return codes 0x00, 0x01, 0x02, 0x03, 0x04, 0x05 on CONNACK')
test.todo('can send PUBLISH packet')
test.todo('can send SUBSCRIBE packet')
test.todo('must have same packet identifier on SUBSCRIBE and SUBACK packet')

/* TODO: Stub out more tests */

/* =============================== END TESTS =============================== */


/* ====================== BEGIN after/afterEach HOOKS ====================== */
test.afterEach.always(cleanupBetweenTestsMacro)

test.after.always(cleanupAfterAllTestsMacro)
/* ======================= END after/afterEach HOOKS ======================= */