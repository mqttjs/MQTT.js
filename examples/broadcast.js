MQTTServer = require("../mqtt").MQTTServer;
s = new MQTTServer();

s.server.listen(1883, "::1");

list = [];

s.on('new_client', function(client) {

    client.on('connect', function(packet)  {
	this.clientId = packet.clientId;
	list[this.clientId] = this;
	this.connack(0);
    });

    client.on('subscribe', function(packet) {
	var qos = []
	for(var i = 0; i < packet.subscriptions.length; i++) {
	    qos.push(packet.subscriptions[i].qos);
	}

	client.suback(packet.messageId, qos);
    });

    client.on('publish', function(packet) {
	/* Publish to everybody */
	for(var k in list) {
	    var c = list[k];
	    c.publish(packet.topic, packet.payload);
	}
    });


    client.on('pingreq', function(packet) {
	client.pingresp();
    });

    client.on('disconnect', function() {
	this.socket.end();
	delete list[this];
    });

    client.on('error', function(error) {
	this.socket.end();
	delete list[this];
    });

});
