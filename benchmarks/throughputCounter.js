#! /usr/bin/env node

var mqtt = require('../');

var client = mqtt.createClient(1883, { encoding: 'binary' });
var counter = 0;
var interval = 15000;

function count() {
  console.log("msg/s", counter / interval * 1000);
  counter = 0;
  setTimeout(count, interval);
}

client.on('connect', function() {
  count();
  this.subscribe('test');
  this.on("message", function() {
    counter++;
  });
});
