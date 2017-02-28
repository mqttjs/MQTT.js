'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("../client");
exports.MqttClient = client_1.MqttClient;
var wsBuilder = require("./ws");
var url = require("url");
var xtend = require("xtend");
var protocols = {};
exports.protocols = protocols;
if (process.title !== 'browser') {
    protocols.mqtt = require('./tcp');
    protocols.tcp = require('./tcp');
    protocols.ssl = require('./tls');
    protocols.tls = require('./tls');
    protocols.mqtts = require('./tls');
}
protocols.ws = wsBuilder;
protocols.wss = wsBuilder;
/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
function parseAuthOptions(opts) {
    var matches;
    if (opts.auth) {
        matches = opts.auth.match(/^(.+):(.+)$/);
        if (matches) {
            opts.username = matches[1];
            opts.password = matches[2];
        }
        else {
            opts.username = opts.auth;
        }
    }
}
function setProtocol(opts, protocol) {
    switch (protocol) {
        case 'ws':
        case 'wss':
        case 'tcp':
        case 'mqtt':
        case 'ssl':
        case 'mqtts':
            opts.protocol = protocol;
            break;
        default:
            throw new Error("unrecognised protocol " + protocol);
    }
}
// function connect(brokerUrl: string, options?: ClientOptions): MqttClient
// function connect(options?: ClientOptions): MqttClient
// function connect(): MqttClient
/**
 * connect - connect to an MQTT broker.
 *
 * @param {String} [brokerUrl] - url of the broker, optional
 * @param {Object} opts - see MqttClient#constructor
 */
function connect(brokerUrl, opts) {
    if ((typeof brokerUrl === 'object') && !opts) {
        opts = brokerUrl;
        brokerUrl = null;
    }
    opts = opts || {};
    if (typeof brokerUrl === 'string') {
        opts = xtend(url.parse(brokerUrl, true), opts);
        if (opts.port != null) {
            opts.port = +opts.port;
        }
        if (opts.protocol === null) {
            throw new Error('Missing protocol');
        }
        setProtocol(opts, opts.protocol.replace(/:$/, ''));
    }
    // merge in the auth options if supplied
    parseAuthOptions(opts);
    // support clientId passed in the query string of the url
    if (opts.query && typeof opts.query.clientId === 'string') {
        opts.clientId = opts.query.clientId;
    }
    if (opts.cert && opts.key) {
        if (opts.protocol) {
            if (['mqtts', 'wss'].indexOf(opts.protocol) === -1) {
                /*
                 * jshint and eslint
                 * complains that break from default cannot be reached after throw
                 * it is a foced exit from a control structure
                 * maybe add a check after switch to see if it went through default
                 * and then throw the error
                */
                /* jshint -W027 */
                /* eslint no-unreachable:1 */
                switch (opts.protocol) {
                    case 'mqtt':
                        opts.protocol = 'mqtts';
                        break;
                    case 'ws':
                        opts.protocol = 'wss';
                        break;
                    default:
                        throw new Error('Unknown protocol for secure connection: "' + opts.protocol + '"!');
                }
                /* eslint no-unreachable:0 */
                /* jshint +W027 */
            }
        }
        else {
            // don't know what protocol he want to use, mqtts or wss
            throw new Error('Missing secure protocol key');
        }
    }
    if (!protocols[opts.protocol]) {
        var isSecure_1 = ['mqtts', 'wss'].indexOf(opts.protocol) !== -1;
        setProtocol(opts, [
            'mqtt',
            'mqtts',
            'ws',
            'wss'
        ].filter(function (key, index) {
            if (isSecure_1 && index % 2 === 0) {
                // Skip insecure protocols when requesting a secure one.
                return false;
            }
            return (typeof protocols[key] === 'function');
        })[0]);
    }
    if (opts.clean === false && !opts.clientId) {
        throw new Error('Missing clientId for unclean clients');
    }
    function wrapper(client) {
        if (opts.servers) {
            if (!client._reconnectCount || client._reconnectCount === opts.servers.length) {
                client._reconnectCount = 0;
            }
            opts.host = opts.servers[client._reconnectCount].host;
            opts.port = opts.servers[client._reconnectCount].port;
            opts.hostname = opts.host;
            client._reconnectCount++;
        }
        return protocols[opts.protocol](client, opts);
    }
    return new client_1.MqttClient(wrapper, opts);
}
exports.connect = connect;
//# sourceMappingURL=index.js.map