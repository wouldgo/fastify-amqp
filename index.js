'use strict'

const fp = require('fastify-plugin')
const amqpClient = require('amqplib')
const camelcase = require('camelcase')
const wrapChannel = (events, channel) => {
  for (const [anEvent, anHandler] of Object.entries(events)) {
    channel.on(anEvent, anHandler)
  }

  return channel
}
const fastifyAmqp = async function fastifyAmqp (fastify, {
  protocol,
  hostname,
  port,
  username,
  password,
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

    for (const [anEvent, anHandler] of Object.entries(connectionHandlers)) {
      aConnection.on(anEvent, anHandler)
    }

    fastify.addHook('onClose', () => aConnection.close())
    connections[camelcase(aVhost)] = {
      createChannel: async () => {
        const channel = await aConnection.createChannel()

        return wrapChannel(channelHandlers, channel)
      },
      createConfirmChannel: async () => {
        const channel = await aConnection.createConfirmChannel()

        return wrapChannel(channelHandlers, channel)
      }
    }
  }

  fastify.decorate('amqp', connections)
}

module.exports = fp(fastifyAmqp, {
  fastify: '>=1.0.0',
  name: 'fastify-amqp'
})
