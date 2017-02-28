'use strict';
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var tls = require("tls");
function buildBuilder(mqttClient, opts) {
    var connection;
    opts.port = opts.port || 8883;
    opts.host = opts.hostname || opts.host || 'localhost';
    opts.rejectUnauthorized = opts.rejectUnauthorized !== false;
    connection = tls.connect(__assign({}, opts, { port: opts.port }));
    /* eslint no-use-before-define: [2, "nofunc"] */
    connection.on('secureConnect', function () {
        if (opts.rejectUnauthorized && !connection.authorized) {
            connection.emit('error', new Error('TLS not authorized'));
        }
        else {
            connection.removeListener('error', handleTLSerrors);
        }
    });
    function handleTLSerrors(err) {
        // How can I get verify this error is a tls error?
        if (opts.rejectUnauthorized) {
            mqttClient.emit('error', err);
        }
        // close this connection to match the behaviour of net
        // otherwise all we get is an error from the connection
        // and close event doesn't fire. This is a work around
        // to enable the reconnect code to work the same as with
        // net.createConnection
        connection.end();
    }
    connection.on('error', handleTLSerrors);
    return connection;
}
module.exports = buildBuilder;
//# sourceMappingURL=tls.js.map