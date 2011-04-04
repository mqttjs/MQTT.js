MQTTServer = require("../mqtt").MQTTServer;
sys = require("sys");

s = new MQTTServer();

s.server.listen(1883, "::1");

list = [];

s.on('new_client', function(client) {
    sys.log("New client emitted");

    client.on('connect', function(packet)  {
	this.clientId = packet.clientId;
	list[this.clientId] = this;
	this.connack(0);
    });

    client.on('subscribe', function(packet) {
	for(var i = 0; i < packet.subscriptions.length; i++) {
	    var subStr = packet.subscriptions[i].topic;
	    /* # is 'match anything to the end of the string' */
	    /* + is 'match anything but a / until you hit a /' */
	    var reg = new RegExp(subStr.replace('+', '[^\/]+').replace('#', '.+$'));

	    sys.log(reg);

	    client.subscriptions.push(reg);
	}
    });

    client.on('publish', function(packet) {
	/* Iterate over our list of clients */
	for(var k in list) {
	    var c = list[k];
	    var publishTo = false;
	    /* Iterate over the client's subscriptions */
	    for(var i = 0; i < c.subscriptions.length; i++) {
		/* If the client has a subscription matching
		 * the packet...
		 */
		var s = c.subscriptions[i];
		if(s.test(packet.topic)) {
		    publishTo = true;
		}
	    }
	    if(publishTo) {
		c.publish(packet.topic, packet.payload);
	    }
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
