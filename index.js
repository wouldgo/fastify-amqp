'use strict'

const fp = require('fastify-plugin')
const amqpClient = require('amqplib')
const camelcase = require('camelcase')
const wrap = (events, hostname, aVhost, what) => {
  for (const [anEvent, anHandler] of Object.entries(events)) {
    what.on(anEvent, (...args) => anHandler(hostname, aVhost, ...args))
  }

  return what
}
const fastifyAmqp = async function fastifyAmqp (fastify, {
  protocol = 'amqp',
  hostname = 'localhost',
  port = 5672,
  username = 'guest',
  password = 'guest',
  locale,
  frameMax,
  heartbeat = 60,
  vhost,
  vhosts = [],
  connectionHandlers = {},
  channelHandlers = {}
}) {
  const currentVhosts = vhosts
  if (vhost != null) {
    currentVhosts.push(vhost)
  }

  if (vhosts.length === 0) {
    currentVhosts.push('/')
  }
  const connections = {}
  for (const aVhost of currentVhosts) {
    const aConnection = await amqpClient.connect({
      protocol,
      hostname,
      port,
      username,
      password,
      locale,
      frameMax,
      heartbeat,
      vhost: aVhost
    })

    const wrappedConnection = wrap(connectionHandlers, hostname, aVhost, aConnection)

    fastify.addHook('onClose', () => wrappedConnection.close())
    connections[camelcase(aVhost)] = {
      createChannel: async () => {
        const channel = await wrappedConnection.createChannel()

        return wrap(channelHandlers, hostname, aVhost, channel)
      },
      createConfirmChannel: async () => {
        const channel = await wrappedConnection.createConfirmChannel()

        return wrap(channelHandlers, hostname, aVhost, channel)
      }
    }
  }

  fastify.decorate('amqp', connections)
}

module.exports = fp(fastifyAmqp, {
  fastify: '>=1.0.0',
  name: 'fastify-amqp'
})
