/* eslint-disable import/no-extraneous-dependencies */
'use strict';

const {promisify} = require('util')
  , {test} = require('tap')
  , fastify = require('fastify')
  , fastifyAmqp = require('./index')
  , waitABit = promisify(setTimeout);

test('localhost guest:guest to / not permitted', async subTest => {
  subTest.plan(4);
  const server = fastify();

  subTest.teardown(() => server.close());
  try {

    await server.register(fastifyAmqp, {});
  } catch (err) {
    subTest.equal(typeof err, typeof {});
    subTest.ok(err instanceof Error);

    subTest.ok(err.message, 'Handshake terminated by server: 403 (ACCESS-REFUSED) with message "ACCESS_REFUSED - Login was refused using authentication mechanism PLAIN. For details see the broker logfile.');
    subTest.notOk(server.amqp, 'Should not has amqp');
  }
});

test('localhost me:me to / permitted', async subTest => {
  subTest.plan(1);
  const server = fastify();

  subTest.teardown(() => server.close());

  try {
    await server.register(fastifyAmqp, {
      'username': 'me',
      'password': 'me'
    });
  } catch (err) {
    subTest.fail('Should connect with these attributes!');
  }

  const {amqp} = server;

  subTest.ok(amqp);
});

test('localhost me:me to / publish with channel and he cant', async subTest => {
  subTest.plan(6);
  const server = fastify();

  try {
    await server.register(fastifyAmqp, {
      'username': 'me',
      'password': 'me',
      'connectionHandlers': {
        'close': () => {
          subTest.pass('Everything is fine');
        }
      },
      'channelHandlers': {
        'error': (hostname, aVhost, err) => {
          const {message} = err;

          subTest.ok(hostname, 'localhost');
          subTest.ok(aVhost, '/');
          subTest.ok(message, 'Channel closed by server: 404 (NOT-FOUND) with message "NOT_FOUND - no exchange \'not-exists\' in vhost \'/\'"');
        },
        'close': () => {
          subTest.pass('Everything is fine');
        }
      }
    });
  } catch (err) {
    subTest.fail('Should connect with these attributes!');
  }

  const {amqp} = server;

  subTest.ok(amqp);

  const {'/': rootVh} = amqp;

  const aChannel = await rootVh.createChannel();

  aChannel.publish('not-exists', 'none', Buffer.from([1]));

  await waitABit(1000);

  server.close();
  await waitABit(1000);
});

test('localhost me:me to / publish with confirm channel and he cant', async subTest => {
  subTest.plan(6);
  const server = fastify();

  try {
    await server.register(fastifyAmqp, {
      'username': 'me',
      'password': 'me',
      'connectionHandlers': {
        'close': () => {
          subTest.pass('Everything is fine');
        }
      },
      'channelHandlers': {
        'error': (hostname, aVhost, err) => {
          const {message} = err;

          subTest.ok(hostname, 'localhost');
          subTest.ok(aVhost, '/');
          subTest.ok(message, 'Channel closed by server: 404 (NOT-FOUND) with message "NOT_FOUND - no exchange \'not-exists\' in vhost \'/\'"');
        },
        'close': () => {
          subTest.pass('Everything is fine');
        }
      }
    });
  } catch (err) {
    subTest.fail('Should connect with these attributes!');
  }

  const {amqp} = server;

  subTest.ok(amqp);

  const {'/': rootVh} = amqp;

  const aChannel = await rootVh.createConfirmChannel();

  aChannel.publish('not-exists', 'none', Buffer.from([1]));

  await waitABit(1000);

  server.close();
  await waitABit(1000);
});

test('localhost me:me to / permitted (specified)', async subTest => {
  subTest.plan(1);
  const app = fastify();

  subTest.teardown(() => app.close());

  try {
    await app.register(fastifyAmqp, {
      'username': 'me',
      'password': 'me',
      'vhost': '/'
    });
  } catch (err) {
    subTest.fail('Should connect with these attributes!');
  }

  const {amqp} = app;

  subTest.ok(amqp);
});
