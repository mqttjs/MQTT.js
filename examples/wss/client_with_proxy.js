'use strict'

const mqtt = require('mqtt')
const url = require('url')
const HttpsProxyAgent = require('https-proxy-agent')
/*
host: host of the endpoint you want to connect e.g. my.mqqt.host.com
path: path to you endpoint e.g. '/foo/bar/mqtt'
*/
const endpoint = 'wss://<host><path>'
/* create proxy agent
proxy: your proxy e.g. proxy.foo.bar.com
port: http proxy port e.g. 8080
*/
const proxy = process.env.http_proxy || 'http://<proxy>:<port>'
// eslint-disable-next-line
const parsed = url.parse(endpoint)
// eslint-disable-next-line
const proxyOpts = url.parse(proxy)
// true for wss
proxyOpts.secureEndpoint = parsed.protocol ? parsed.protocol === 'wss:' : true
const agent = new HttpsProxyAgent(proxyOpts)
const wsOptions = {
  agent: agent
  // other wsOptions
  // foo:'bar'
}
const mqttOptions = {
  keepalive: 60,
  reschedulePings: true,
  protocolId: 'MQTT',
  protocolVersion: 4,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  clean: true,
  clientId: 'testClient',
  wsOptions: wsOptions
}

const client = mqtt.connect(parsed, mqttOptions)

client.on('connect', function () {
  console.log('connected')
})

client.on('error', function (a) {
  console.log('error!' + a)
})

client.on('offline', function (a) {
  console.log('lost connection!' + a)
})

client.on('close', function (a) {
  console.log('connection closed!' + a)
})

client.on('message', function (topic, message) {
  console.log(message.toString())
})
