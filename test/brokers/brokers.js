'use strict'

const mqtt = require('../../')
const brokers = require('./brokers.json')
const should = require('should')
should() // to disable unused jslint error

function buildUrl (protocol) {
  return protocol.name + '://localhost:' + protocol.port + (protocol.route || '')
}

if (process.env.RUN_BROKER_TESTS) {
  describe('broker compatibility', () => {
    brokers.forEach(broker => {
      describe(broker.name, () => {
        broker.protocols.forEach(protocol => {
          describe('protocol ' + protocol.name, () => {
            let client
            const pretopic = '/' + broker.name + '/' + protocol.name

            afterEach(() => {
              if (client) {
                client.end()
                client = undefined
              }
            })

            it('should be able to connect to the broker', (done) => {
              client = mqtt.connect(buildUrl(protocol))
              client.on('connect', () => {
                client.connected.should.equal(true)
                done()
              })
            })

            it('should be able to disconnect from the broker', (done) => {
              client = mqtt.connect(buildUrl(protocol))
              client.on('connect', () => {
                client.end(true)
              })
              client.on('close', () => {
                done()
              })
            })

            it('should be able to publish in QoS 0', (done) => {
              client = mqtt.connect(buildUrl(protocol))
              client.on('connect', () => {
                client.subscribe(pretopic + '/testqos0', () => {
                  client.publish(pretopic + '/testqos0', 'QoS 0 works')
                })
              })
              client.on('message', (topic, content, packet) => {
                topic.should.equal(pretopic + '/testqos0')
                content.toString().should.equal('QoS 0 works')
                packet.qos.should.equal(0)
                done()
              })
            })

            it('should be able to publish in QoS 1', (done) => {
              client = mqtt.connect(buildUrl(protocol))
              const receivedPubAck = new Promise((resolve, reject) => {
                client.on('connect', () => {
                  client.subscribe(pretopic + '/testqos1', {qos: 1}, () => {
                    client.publish(pretopic + '/testqos1', 'QoS 1 works', {qos: 1},
                      () => resolve())
                  })
                })
              })
              const receivedMessage = new Promise((resolve, reject) => {
                client.on('message', (topic, content, packet) => {
                  topic.should.equal(pretopic + '/testqos1')
                  content.toString().should.equal('QoS 1 works')
                  packet.qos.should.equal(1)
                  resolve()
                })
              })

              Promise.all([receivedPubAck, receivedMessage])
              .then(() => {
                done()
              })
            })

            if (!broker.NO_QOS2) {
              it('should be able to publish in QoS 2', (done) => {
                client = mqtt.connect(buildUrl(protocol))
                const receivedPubAck = new Promise((resolve, reject) => {
                  client.on('connect', () => {
                    client.subscribe(pretopic + '/testqos2', {qos: 2}, () => {
                      client.publish(pretopic + '/testqos2', 'QoS 2 works', {qos: 2},
                        () => resolve())
                    })
                  })
                })

                const receivedMessage = new Promise((resolve, reject) => {
                  client.on('message', (topic, content, packet) => {
                    topic.should.equal(pretopic + '/testqos2')
                    content.toString().should.equal('QoS 2 works')
                    packet.qos.should.equal(2)
                    resolve()
                  })
                })

                Promise.all([receivedPubAck, receivedMessage])
                .then(() => {
                  done()
                })
              })
            }

            it('should be able to downgrade the QoS while subscribing', (done) => {
              client = mqtt.connect(buildUrl(protocol))
              client.on('connect', () => {
                client.subscribe(pretopic + '/testqosdowngrade', {qos: 0})
                client.publish(pretopic + '/testqosdowngrade', 'QoS downgrade works', {qos: 2})
              })
              client.on('message', (topic, content, packet) => {
                topic.should.equal(pretopic + '/testqosdowngrade')
                content.toString().should.equal('QoS downgrade works')
                packet.qos.should.equal(0)
                done()
              })
            })

            it('should be able to unsubscribe', (done) => {
              client = mqtt.connect(buildUrl(protocol))
              let messagesReceived = 0

              client.on('connect', () => {
                client.subscribe(pretopic + '/testunsubscribe', () => {
                  client.publish(pretopic + '/testunsubscribe', 'First Message')
                })
              })

              client.on('message', (topic, content, packet) => {
                messagesReceived.should.equal(0)
                ++messagesReceived
                client.unsubscribe(pretopic + '/testunsubscribe', () => {
                  client.publish('testunsubscribe', 'Second Message', () => {
                    setTimeout(() => {
                      done()
                    }, 200) // Wait for the message to arrive
                  })
                })
              })
            })

            it('should handle last-will', (done) => {
              const dyingClient = mqtt.connect(buildUrl(protocol), {
                will: {
                  topic: pretopic + '/lwt',
                  payload: 'byebye',
                  qos: 1
                },
                keepalive: 1
              })

              client = mqtt.connect(buildUrl(protocol))

              const dyingConnected = new Promise((resolve, reject) => {
                dyingClient.on('connect', () => {
                  resolve()
                })
              })
              const clientConnected = new Promise((resolve, reject) => {
                client.on('connect', () => {
                  resolve()
                })
              })

              Promise.all([dyingConnected, clientConnected])
              .then(() => {
                client.on('message', (topic, content) => {
                  console.log('message received')
                  topic.should.equal(pretopic + '/lwt')
                  content.toString().should.equal('byebye')
                  done()
                })

                client.subscribe(pretopic + '/lwt', () => {
                  dyingClient.end(true) // simulates a disconnection
                })
              })
            })
          })
        })
      })
    })
  })
}
