var mqtt = require('../..');

mqtt.createSecureClient(process.argv[2], process.argv[3], "private-key.pem", "public-cert.pem", function(err,client) {
  if (client) {
    console.log("Client isn't null");
    client.connect({ keepalive: 60, client: "tls_test_client" });
    client.on("connack", function(packet) {
      console.log( JSON.stringify(packet) );
    });
  } else {
    console.log("Error " + JSON.stringify(err));
  }
});
