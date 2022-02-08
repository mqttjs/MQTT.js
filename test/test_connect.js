import test from 'ava';
import aedes from 'aedes';
import { createServer } from 'node:net';
import { connect } from '../dist/index.js';
import { logger } from '../dist/utils/logger.js';

test.before('set up aedes broker', async t => {
  t.context.broker = aedes();
  t.context.server = createServer(t.context.broker.handle);
  return new Promise(resolve => {
    t.context.server.listen(1883, () => {
      logger.test('server listening on port 1883');
      t.context.broker.on('clientError', (client, err) => {
        logger.test('client error', client.id, err.message, err.stack);
      });

      t.context.broker.on('connectionError', (client, err) => {
        logger.test('connection error', client, err.message, err.stack);
      });

      t.context.broker.on('publish', (packet, client) => {
        if (client) {
          logger.test('message from client', client.id);
        }
      });

      t.context.broker.on('subscribe', (subscriptions, client) => {
        if (client) {
          logger.test(`subscribe from client: ${subscriptions}, ${client.id}`);
        }
      });

      t.context.broker.on('publish', (packet, client) => {
        if (client) {
          logger.test(`message from client: ${client.id}`);
        }
      });

      t.context.broker.on('client', (client) => {
        logger.test(`new client: ${client.id}`);
      });
      resolve();
    })
  });
});

test('should send a CONNECT packet to the broker and receive a CONNACK', (t) => {
  t.plan(0)
  const clientId = 'basic-connect-test'

  let resolveClientConnected
  const clientConnectedPromise = new Promise((resolve) => {
    resolveClientConnected = resolve
  })

  const clientConnectedListener = (client) => {
    if (client.id === clientId) {
      t.context.broker.removeListener('client', clientConnectedListener)
      resolveClientConnected()
    }
  }
  t.context.broker.on('client', clientConnectedListener)
  
  const clientPromise = connect({
    brokerUrl: 'mqtt://localhost',
    clientId
  })

  return Promise.all([clientConnectedPromise, clientPromise])
})