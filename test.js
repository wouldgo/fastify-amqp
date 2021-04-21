const { test } = require('tap')

const Fastify = require('fastify')
const fastifyAmqp = require('./index')
const { promisify } = require('util')
const waitABit = promisify(setTimeout)

function build (t) {
  const app = Fastify()

  t.teardown(app.close.bind(app))

  return app
}

test('localhost guest:guest to / not permitted', async (t) => {
  t.plan(4)
  const app = build(t)

  try {
    await app.register(fastifyAmqp, {})
  } catch (err) {
    t.equal(typeof err, typeof {})
    t.ok(err instanceof Error)

    t.ok(err.message, 'Handshake terminated by server: 403 (ACCESS-REFUSED) with message "ACCESS_REFUSED - Login was refused using authentication mechanism PLAIN. For details see the broker logfile.')
    t.notOk(app.amqp, 'Should not has amqp')
  }
})

test('localhost me:me to / permitted', async t => {
  t.plan(1)
  const app = build(t)

  try {
    await app.register(fastifyAmqp, {
      username: 'me',
      password: 'me'
    })
  } catch (err) {
    t.fail('Should connect with these attributes!')
  }

  const { amqp } = app

  t.ok(amqp)
})

test('localhost me:me to / publish with channel and he cant', async t => {
  t.plan(4)
  const app = Fastify()

  try {
    await app.register(fastifyAmqp, {
      username: 'me',
      password: 'me',
      connectionHandlers: {
        close: () => {
          t.pass('Everything is fine')
        }
      },
      channelHandlers: {
        error: err => {
          const { message } = err

          t.ok(message, 'Channel closed by server: 404 (NOT-FOUND) with message "NOT_FOUND - no exchange \'not-exists\' in vhost \'/\'"')
        },
        close: () => {
          t.pass('Everything is fine')
        }
      }
    })
  } catch (err) {
    t.fail('Should connect with these attributes!')
  }

  const { amqp } = app

  t.ok(amqp)

  const { '/': rootVh } = amqp

  const aChannel = await rootVh.createChannel()
  aChannel.publish('not-exists', 'none', Buffer.from([1]))

  await waitABit(1000)

  app.close()
  await waitABit(1000)
})

test('localhost me:me to / publish with confirm channel and he cant', async t => {
  t.plan(4)
  const app = Fastify()

  try {
    await app.register(fastifyAmqp, {
      username: 'me',
      password: 'me',
      connectionHandlers: {
        close: () => {
          t.pass('Everything is fine')
        }
      },
      channelHandlers: {
        error: err => {
          const { message } = err

          t.ok(message, 'Channel closed by server: 404 (NOT-FOUND) with message "NOT_FOUND - no exchange \'not-exists\' in vhost \'/\'"')
        },
        close: () => {
          t.pass('Everything is fine')
        }
      }
    })
  } catch (err) {
    t.fail('Should connect with these attributes!')
  }

  const { amqp } = app

  t.ok(amqp)

  const { '/': rootVh } = amqp

  const aChannel = await rootVh.createConfirmChannel()
  aChannel.publish('not-exists', 'none', Buffer.from([1]))

  await waitABit(1000)

  app.close()
  await waitABit(1000)
})
