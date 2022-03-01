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
  const connectReceivedPromise = new Promise((resolve) => {
    const connectReceivedListener = (packet) => {
      logger.info(`connect received: ${packet}`)
      if (!packet.clientId.startsWith('mqttjs_')) return
      t.context.broker.removeListener('connectReceived', connectReceivedListener)
      resolve(packet);
    }
    t.context.broker.on('connectReceived', connectReceivedListener)
  });
  const client = await connect({ brokerUrl: `mqtt://localhost:${port}`});
  const sentPacket = await connectReceivedPromise;

  client.on('error', (e) => {
    // TODO: When publishing a malformed publish packet, the client receives a ECONNRESET because of a disconnect. 
    // We should figure out a better way to handle this error gracefully.
    logger.error(`Client emitted error: ${e.message}`)
    return t.fail(e.message)
  })
  // validate the clientId received is thec correct clientId.
  t.deepEqual(sentPacket.clientId, client._options.clientId)

  t.context.broker.on('publish', async (packet, clientOnBroker) => {
    logger.info(`broker received publish on ${clientOnBroker}`);
    logger.info(`publish packet: ${JSON.stringify(packet)}`)
    if (clientOnBroker && clientOnBroker.id === client._options.clientId) {
      logger.info(`testing packet on client ${clientOnBroker.id}`)
      t.assert(packet.cmd === 'publish')
      t.assert(packet.topic === 'fakeTopic')
      t.assert(packet.payload === 'fakeMessage')
    }
    logger.info(`calling disconnect.`)
    await client.disconnect();
  })

  logger.info(`calling publish.`)
  try {
    await client.publish({topic: 'fakeTopic', payload: 'fakeMessage'});
  } catch (e) {
    logger.error(`failed on publish with error: ${e}`);
    return t.fail(e.message);
  }
})


test('handles error on malformed publish packet', async (t) => {
  const connectReceivedPromise = new Promise((resolve) => {
    const connectReceivedListener = (packet) => {
      logger.info(`connect received: ${packet}`)
      if (!packet.clientId.startsWith('mqttjs_')) return
      t.context.broker.removeListener('connectReceived', connectReceivedListener)
      resolve(packet);
    }
    t.context.broker.on('connectReceived', connectReceivedListener)
  });
  const client = await connect({ brokerUrl: `mqtt://localhost:${port}`});
  const sentPacket = await connectReceivedPromise;

  client.on('error', (e) => {
    // TODO: When publishing a malformed publish packet, the client receives a ECONNRESET because of a disconnect. 
    // We should figure out a better way to handle this error gracefully.
    logger.error(`Client emitted error: ${e.message}`)
    return t.fail(e.message)
  })
  // validate the clientId received is thec correct clientId.
  t.deepEqual(sentPacket.clientId, client._options.clientId)

  t.context.broker.on('publish', async (packet, clientOnBroker) => {
    logger.info(packet)
    // if (clientOnBroker && clientOnBroker.id === client._options.clientId) {
    //   logger.info(`testing packet on client ${clientOnBroker.id}`)
    //   t.assert(packet.cmd === 'publish')
    //   t.assert(packet.topic === 'fakeTopic')
    //   t.assert(packet.message === 'fakeMessage')
    // }
    // logger.info(`calling disconnect.`)
    // await client.disconnect();
  })

  logger.info(`calling publish.`)
  try {
    await client.publish({topic: 'fakeTopic', message: 'fakeMessage'});
  } catch (e) {
    logger.error(`failed on publish with error: ${e}`);
    return t.fail(e.message);
  }
})

// test('client will PUBACK on QoS 1 Publish received from server', (t) => {
//   const connectReceivedPromise = new Promise((resolve) => {
//     const connectReceivedListener = (packet) => {
//       logger.info(`connect received: ${packet}`)
//       if (!packet.clientId.startsWith('mqttjs_')) return
//       t.context.broker.removeListener('connectReceived', connectReceivedListener)
//       resolve(packet);
//     }
//     t.context.broker.on('connectReceived', connectReceivedListener)
//   });
//   const client = await connect({ brokerUrl: `mqtt://localhost:${port}`});
//   const sentPacket = await connectReceivedPromise;

//   // validate the clientId received is the correct clientId.
//   t.deepEqual(sentPacket.clientId, client._options.clientId)

//   t.context.broker.on('client', (client) => {
//     logger.info(`new client: ${client.id}`)
//   })

//   t.context.broker.on('publish', (packet, clientOnBroker) => {
//     if (clientOnBroker && clientOnBroker.id === client._options.clientId) {
//       logger.info(`testing packet on client ${clientOnBroker.id}`)
//       t.assert(packet.cmd === 'publish')
//       t.assert(packet.topic === 'fakeTopic')
//       t.assert(packet.message === 'fakeMessage')
//       logger.info(`calling disconnect.`)
//       await client.disconnect();
//     }
//   })

//   logger.info(`calling publish.`)
//   await client.publish({cmd: 'publish', topic: 'fakeTopic', message: 'fakeMessage'});
// })

test.todo('client handles malformed publish failure from mqtt-packet')

/* =============================== END TESTS =============================== */


/* ====================== BEGIN after/afterEach HOOKS ====================== */
test.afterEach.always(cleanupBetweenTestsMacro)

test.after.always(cleanupAfterAllTestsMacro)
/* ======================= END after/afterEach HOOKS ======================= */