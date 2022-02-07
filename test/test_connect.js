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

/* TODO */
test('should send a CONNECT packet to the broker and receive a CONNACK', async t => {
  const client = await connect({
    brokerUrl: 'mqtt://localhost',
  });
  t.assert(!!client);
});

/**
 * 1) Send a Connect packet
 * 2) writeToStream returns false and emits an error on this.conn('error')
 * 
 * We shouldn't be throwing away the whole client because 1 packet failed.
 * 
 * UPDATE: matteo advises otherwise: https://github.com/mqttjs/mqtt-packet/issues/126#issuecomment-1029373619
 */