import mqtt from 'mqtt'
const client = mqtt.connect()

client.publish('presence', 'hello!')
client.end()
