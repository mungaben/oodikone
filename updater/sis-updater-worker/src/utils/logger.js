const winston = require('winston')
const { isDev } = require('../config')
const { combine, timestamp, printf, splat } = winston.format

let transports = []

if (isDev) {
  const devFormat = printf(
    ({ level, message, timestamp, ...rest }) => `${timestamp} ${level}: ${message} ${JSON.stringify(rest)}`
  )

  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: combine(splat(), timestamp(), devFormat),
    })
  )
} else {
  const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
  }

  const prodFormat = winston.format.printf(({ level, ...rest }) =>
    JSON.stringify({
      level: levels[level],
      ...rest,
    })
  )
  transports.push(new winston.transports.Console({ format: prodFormat }))
}

const logger = winston.createLogger({ transports })

logger.on('error', e => console.error('Logging failed! Reason: ', e)) // eslint-disable-line no-console

module.exports = {
  logger,
}
