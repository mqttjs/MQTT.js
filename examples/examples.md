Examples
========

orig.js
-------

orig.js is a partial implementation of the original MQTT pub/sub style.
It's pretty inefficient since it uses regular expressions to match
hierarchies rather than an actual tree.

It also doesn't implement QoS or retained messages

broadcast.js
------------

broadcast.js is a simple publish-to-all pub/sub server.
It simply republishes all published message to all connected
clients.

regex.js
--------

regex.js has subscribers subscribing to regular expressions
and the server delivering messages whose topics match that
regular expression
