const mqtt = require('../..')

const clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8)

const options = {
  port: 1883,
  clientId: clientId,
  username: 'saurabh',
  password: 'hiorb@567',
  clean: false,
  maxConnect: 3,
  reconnectPeriod: 500
}
const testingHost = ''
const clientPublisher = mqtt.connect('mqtt://' + testingHost, options)

clientPublisher.on('error', function (err) {
  console.log(err)
})

clientPublisher.on('reconnect', function (err) {
  if (err) { console.log(err) }
  console.log('client trying to reconnect')
})
clientPublisher.on('connect', function (connack) { // When connected
  // when a message arrives, do something with it
  console.log('==> first client connected <==')
})

clientPublisher.on('close', function (err) {
  console.log('==> closing connection for second client <==')
  console.log(err)
})

setTimeout(setUpAnotherClient, 5000)

function setUpAnotherClient () {
  const clientPublisher1 = mqtt.connect('mqtt://' + testingHost, {...options,
    ...{
      maxConnect: 1
    }})
  clientPublisher1.on('error', function (err) {
    console.log('==> error for second client <==')
    console.log(err)
  })
  clientPublisher1.on('close', function (err) {
    console.log('==> closing connection for second client <==')
    console.log(err)
  })
  clientPublisher1.on('connect', function (connack) { // When connected
    // when a message arrives, do something with it
    console.log('==> second client connected <==')
  })
}
