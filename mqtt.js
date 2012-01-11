/* Copyright (c) 2011 Adam Rudd. See LICENSE for more information */

var net = require('net'),
	util = require('util');

var defaultPort = 1883;

var defaultHost = '127.0.0.1';

function Server(listener) {
	if (!(this instanceof Server)) return new Server(arguments[0], arguments[1]);

	var self = this;

	net.Server.call(self);

	if (listener) {
		self.on('client', listener);
	}

	var Connection = require('./connection');
	self.on('connection', function(socket) {
		self.emit('client', new Connection(socket, self));
	});
}

util.inherits(Server, net.Server);

module.exports.createServer = function(listener) {
	return new Server(listener);
};
