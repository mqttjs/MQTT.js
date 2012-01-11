/* Copyright (c) 2011 Adam Rudd. See LICENSE for more information */

var net = require('net'),
	util = require('util');

var Connection = require('./connection');

function Server(listener) {
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

module.exports.createConnection = function(host, port, callback) {
	var socket = net.createConnection(host, port),
		client = new Connection(socket, null);

	socket.on('connect', function() {
		client.emit('connected');
	});

	return client;
}
