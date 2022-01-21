import {pino} from "pino"


export const logger = pino({
  name: 'app-name',
  level: 'debug',
  prettyPrint: process.env["NODE_ENV"] !== "production",
})