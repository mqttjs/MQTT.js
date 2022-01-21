import { logger } from './logger.js'

export function validateTopic (topic: string, message: string): boolean {
  const end = topic.length - 1
  const endMinus = end - 1
  const slashInPreEnd = endMinus > 0 && topic.charCodeAt(endMinus) !== 47
  if (topic.length === 0) { // [MQTT-3.8.3-3]
    const err =  new Error('impossible to ' + message + ' to an empty topic')
    logger.info(err)
    return false
  }
  for (let i = 0; i < topic.length; i++) {
    switch (topic.charCodeAt(i)) {
      case 35: { // #
        const notAtTheEnd = i !== end
        if (notAtTheEnd || slashInPreEnd) {
          const err = new Error('# is only allowed in ' + message + ' in the last position')
          logger.info(err)
          return false
        }
        break
      }
      case 43: { // +
        const pastChar = i < end - 1 && topic.charCodeAt(i + 1) !== 47
        const preChar = i > 1 && topic.charCodeAt(i - 1) !== 47
        if (pastChar || preChar) {
          const err =  new Error('+ is only allowed in ' + message + ' between /')
          logger.info(err)
          return false
        }
        break
      }
    }
  }
  return true
}
