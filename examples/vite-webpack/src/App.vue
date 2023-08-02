<script setup>
import { ref } from 'vue'
import { connect } from 'mqtt'

const connected = ref(false)

const client = connect('wss://test.mosquitto.org:8081');

const messages = ref([])

client.on("connect", () => {
  console.log("connected");
  connected.value = true
  client.subscribe("presence", (err) => {
    if (!err) {
      console.log("subscribed");
      client.publish("presence", "Hello mqtt");
    }
  });
});

client.on("message", (topic, message) => {
  console.log('message', topic, message.toString());
  // message is Buffer
  messages.value.push(message.toString());
});

client.on("close", () => {
  console.log("close");
  connected.value = false
});

</script>

<template>
  <main>
    <h1>MQTTjs VITE Example</h1>
    <p>
      MQTTjs is a simple MQTT client for the browser. It uses WebSockets to
      connect to an MQTT broker.
    </p>
    <p>
      This example uses the public MQTT broker at
      <a href="https://test.mosquitto.org/">test.mosquitto.org</a>.
    </p>
    
    <p>Status: {{ connected ? 'Connected' : 'Disconnected' }}</p>
    <p>
      <button @click="client.publish('presence', 'Hello mqtt')">Publish</button>
      <button @click="client.end()">Disconnect</button>
    </p>
    <p>Messages:</p>
    <ul>
      <li v-for="message in messages" :key="message">{{ message }}</li>
    </ul>
    
  </main>
</template>


