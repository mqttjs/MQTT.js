import {pino} from "pino"

export const logger = pino({
  name: 'mqtt',
  level: 'trace',
  customLevels: {
    test: 35
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'time,hostname',
      translateTime: 'yyy-dd-mm, h:MM:ss TT'
    }
  }
})