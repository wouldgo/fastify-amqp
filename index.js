'use strict'

const fp = require('fastify-plugin')
const amqpClient = require('amqplib')

const manageAConn = async (user, pass, host, port, vhost) => {
  const connection = await amqpClient.connect(`amqp://${user}:${pass}@${host}:${port}/${encodeURIComponent(vhost)}`)

  return connection
}

function fastifyAmqp (fastify, opts, next) {
  const host = opts.host

  if (!host) {
    next(new Error('`host` parameter is mandatory'))
    return
  }
  const port = opts.port || 5672
  const user = opts.user || 'guest'
  const pass = opts.pass || 'guest'
  const vhost = opts.vhost || ''
  const vhosts = opts.vhosts || []

  if (Array.isArray(vhosts) && vhosts.length > 0) {
    return vhosts.reduce((prev, aVhost) =>
      prev.then(partialObj =>
        manageAConn(user, pass, host, port, aVhost)
          .then(connection => {
            fastify.addHook('onClose', () => connection.close())

            return {
              ...partialObj,
              [aVhost]: connection
            }
          }))
    , Promise.resolve({}))
      .then(vhostsConns => {
        fastify.decorate('amqpConn', vhostsConns)
      })
  }

  amqpClient.connect(`amqp://${user}:${pass}@${host}:${port}/${encodeURIComponent(vhost)}`, function (err, connection) {
    if (err) {
      next(err)
      return
    }
    fastify.addHook('onClose', () => connection.close())
    fastify.decorate('amqpConn', connection)

    connection.createChannel(function (err1, channel) {
      if (err1) {
        next(err1)
        return
      }

      fastify.decorate('amqpChannel', channel)
      next()
    })
  })
}

module.exports = fp(fastifyAmqp, {
  fastify: '>=1.0.0',
  name: 'fastify-amqp'
})
