MQTTServer = require("../mqtt").MQTTServer;
sys = require("sys");
inspect = require("util").inspect;
s = new MQTTServer();
s.server.listen(1883, "::1");

list = [];

s.on('new_client', function(client) {
    sys.log("New client emitted");
    list.push(client);
    client.on('connect', function(packet)  {
	sys.log(inspect(packet));
	client.connack(0);
    });

    client.on('publish', function(packet) {
	for(var i = 0; i < list.length; i++) {
	    var curClient = list[i];
	    /* For each of our subscription regexes */
	    for(var j = 0; j < curClient.subscriptions.length; j++) {
		/* If the regex matches the published topic */
		var sub = curClient.subscriptions[j];
		if(sub.test(packet.topic)) {
		    /* Publish the message */
		    curClient.publish(packet.topic, packet.payload);
		}
	    }
	}
    });

    client.on('subscribe', function(packet) {
	sys.log(inspect(packet));

	for(var i = 0; i < packet.subscriptions.length; i++) {
	    client.subscriptions.push(new RegExp(packet.subscriptions[i].topic));
	}

	/* Give 'em whatever they want */
	/* Hello flaw in the protocol! */
	var qos = [];
	for(var i = 0; i < packet.subscriptions; i++) {
	    qos.push(packet.subscriptions[i].qos);
	}

	client.suback(packet.messageId, qos);
    });

    client.on('pingreq', function(packet) {
	client.pingresp();
    });

    client.on('disconnect', function() {
	this.socket.end();
	list = list.filter(function(x) {
	    if(x === client) {
		return false;
	    } else {
		return true;
	    }
	});
    });

    client.on('error', function(error) {
	this.socket.end();
	list = list.filter(function(x) {
	    if(x === client) {
		return false;
	    } else {
		return true;
	    }
	});
    });
});
