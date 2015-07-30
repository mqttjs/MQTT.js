var mqtt = require('mqtt');

var client_Id = 'mqttjs_' + Math.random().toString(16).substr(2, 8);

var host = 'wss://localhost:3001/Mosca';

var options = {
    keepalive: 10,
    clientId: client_Id,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    will: {
        topic: 'WillMsg',
        payload: 'Connection Closed abnormally..!',
        qos: 0,
        retain: false
    },
    username: 'demo',
    password: 'demo',
    rejectUnauthorized: false,
};

var client = mqtt.connect(host, options);

client.on('error', function (err) {
    console.log(err);
    client.end();
});

client.on('connect', function () {
    console.log('client connected:' + client_Id);    
});

client.subscribe("topic", { qos: 0 });

client.publish("topic", "wss secure connection demo...!", { qos: 0, retained: false });

client.on('message', function (topic, message, pakcet) {
    console.log("Recieved Message:= " + message.toString() + "\nOn topic:= " + topic);
});

client.on('close', function () {
    console.log(client_Id + " disconected");
});
