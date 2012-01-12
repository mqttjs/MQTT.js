/* Copyright (c) 2011 Adam Rudd. See LICENSE for more information */

var net = require('net'),
	util = require('util');

var defaultHost = '127.0.0.1',
	defaultPort = 1883;

var Connection = require('./connection');

var Server = module.exports.Server = function Server(listener) {
	if (!(this instanceof Server)) return new Server(listener);

	var self = this;

	net.Server.call(self);

	if (listener) {
		self.on('client', listener);
	}

	self.on('connection', function(socket) {
		self.emit('client', new Connection(socket, self));
	});

	return this;
}

util.inherits(Server, net.Server);

module.exports.createServer = function(listener) {
	return new Server(listener);
};

/* TODO: put some smarts in Client, rather than just having it wrap
 * Connection */
var Client = module.exports.Client = function Client(stream) {
	if (!(this instanceof Client)) return new Client(stream);

	return new Connection(stream, null);

}

module.exports.createClient = function(port, host, callback) {
	var host = host || defaultHost,
		port = port || defaultPort,
		callback = callback || function() {},
		net_client, mqtt_client;

	if (typeof arguments[0] === 'function' && arguments.length === 1) {
		port = defaultPort;
		host = defaultHost;
		callback = arguments[0];
	}

	net_client = new net.Socket();

	mqtt_client = new Client(net_client, null);

	net_client.on('connect', function() {
		mqtt_client.emit('connected'); 
	});

	mqtt_client.on('connected', function() {
		callback(mqtt_client);
	});

	net_client.connect(port, host);

	return mqtt_client;
};
