import test from 'ava';
import aedes from 'aedes';
import { createServer } from 'node:net';
import { connect } from '../dist/index.js';

test.before('set up aedes broker', async t => {
  t.context.broker = aedes();
  t.context.server = createServer(t.context.broker.handle);
  await new Promise(resolve => t.context.server.listen(1883, resolve));
});

/* TODO */
test('should send a CONNECT packet to the broker and receive a CONNACK', async t => {
  const client = await connect({
    brokerUrl: 'mqtt://localhost',
  });
});

/**
 * 1) Send a Connect packet
 * 2) writeToStream returns false and emits an error on this.conn('error')
 * 
 * We shouldn't be throwing away the whole client because 1 packet failed.
 * 
 * UPDATE: matteo advises otherwise: https://github.com/mqttjs/mqtt-packet/issues/126#issuecomment-1029373619
 */