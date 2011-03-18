MQTTServer = require("./mqtt").MQTTServer;
sys = require('sys');
inspect = require('util').inspect;
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
	sys.log("Publish packet: " + inspect(packet));
	var f = list.filter(function(x) {
	    if(x === client) {
		return false;
	    } else {
		return true;
	    }
	});

	for(var i = 0; i < f.length; i++) {
	    var c = f[i];
	    for(var j = 0; j < c.subscriptions.length; j++) {
		var sub = c.subscriptions[j];
		var msg = undefined;

		try {
		    msg = JSON.parse(packet.payload);
		} catch(exception) {
		    sys.log("Bad JSON in payload");
		}

		for(var k in sub) {
		    if(msg[k] !== undefined && msg[k] == sub[k]) {
			sys.log("Matched! Publishing!");
			client.publish(packet.topic,packet.payload);
		    }
		}
	    }
	}

    });

    client.on('subscribe', function(packet) {
	sys.log("Subscribe packet: " + inspect(packet));
	var subscriptions = packet.subscriptions;

	for(var i = 0; i < subscriptions.length; i++) {
	    var json = undefined;
	    try {
		json = JSON.parse(subscriptions[i].topic);
	    } catch(exception) {
		sys.log("Bad JSON subscription");
	    }

	    client.subscriptions.push(json);
	}
	

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
});
