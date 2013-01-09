var mqtt = require('../..');

mqtt.createClient(1883, "127.0.0.1", function(err,client) {
	if ( client ) {
		console.log("Client isn't null");
		client.connect({ keepalive: 10, client: "evict_test_client" });
		client.on("connack", function(packet) {
			console.log( JSON.stringify(packet) );
		});
	} else {
		console.log("Error " + JSON.stringify(err));
	}
});
