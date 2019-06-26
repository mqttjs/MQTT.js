'use strict'

var mqtt = require('../..')

// Subscribe to a custom server with a URL string
var client = mqtt.connect('mqtt://test.mosquitto.org:1883')

client.subscribe('presence-retained', { qos: 1 })
client.on('message', function (topic, message) {
  console.log(`Received on '${topic}': ${message.toString()}`)
})

/* Sends the message 'hello!' to the topic 'presence'. The message will be delivered
 * at least once to clients even if they subscribe later.
 * If compiling TypeScript, the options object must include the qos property
 * to be recognized as an instance of IClientPublishOptions (and not the callback).
 * Remaining properties are optional.
 */
client.on('connect', function (topic, message) {
  console.log('Connected')
  client.publish('presence-retained', 'hello!', {qos: 1, retain: true},
    (err) => {
      if (err) {
        console.log('There was an error sending the message.')
        return
      }
      console.log('QoS handling completed')
    }
  )

  // Clear the retained message when no longer needed:
  setTimeout(() => {
    client.publish('presence-retained', '', {qos: 0, retain: true})
    client.end() // Exits this example
  }, 5000)
})
