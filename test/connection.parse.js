/**
 * Testing requires
 */
var should = require('should')
  , Stream = require('./util').TestStream;

/**
 * Units under test
 */
var Connection = require('../lib/connection');

module.exports = function() {

  describe('connect', function() {
    it('should fire a connect event (minimal)', function(done) {
      var expected =  {
        cmd: "connect",
        retain: false,
        qos: 0,
        dup: false,
        length: 18,
        protocolId: "MQIsdp",
        protocolVersion: 3,
        clean: false,
        keepalive: 30,
        clientId: "test"
      };

      var fixture = [
        16, 18, // Header
        0, 6, // Protocol id length
        77, 81, 73, 115, 100, 112, // Protocol id
        3, // Protocol version
        0, // Connect flags
        0, 30, // Keepalive
        0, 4, //Client id length
        116, 101, 115, 116 // Client id
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('connect', function(packet) {
        packet.should.eql(expected);
        done();
      });

    });

    it('should fire a connect event (maximal)', function(done) {
      var expected = {
        cmd: "connect",
        retain: false,
        qos: 0,
        dup: false,
        length: 54,
        protocolId: "MQIsdp",
        protocolVersion: 3,
        will: {
          retain: true,
          qos: 2,
          topic: "topic",
          payload: "payload"
        },
        clean: true,
        keepalive: 30,
        clientId: "test",
        username: "username",
        password: "password"
      };
      var fixture = [
        16, 54, // Header
        0, 6, // Protocol id length
        77, 81, 73, 115, 100, 112, // Protocol id
        3, // Protocol version
        246, // Connect flags
        0, 30, // Keepalive
        0, 4, // Client id length
        116, 101, 115, 116, // Client id
        0, 5, // will topic length
        116, 111, 112, 105, 99, // will topic
        0, 7, // will payload length
        112, 97, 121, 108, 111, 97, 100, // will payload
        0, 8, // username length
        117, 115, 101, 114, 110, 97, 109, 101, // username
        0, 8, // password length
        112, 97, 115, 115, 119, 111, 114, 100 //password
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('connect', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });

    it('should handle binary username/password', function(done) {
      var expected =  {
        cmd: "connect",
        retain: false,
        qos: 0,
        dup: false,
        length: 28,
        protocolId: "MQIsdp",
        protocolVersion: 3,
        clean: false,
        keepalive: 30,
        clientId: "test",
        username: new Buffer([12, 13, 14]),
        password: new Buffer([15, 16, 17]),
      };

      var fixture = [
        16, 28, // Header
        0, 6, // Protocol id length
        77, 81, 73, 115, 100, 112, // Protocol id
        3, // Protocol version
        0x80 | 0x40, // Connect flags
        0, 30, // Keepalive
        0, 4, //Client id length
        116, 101, 115, 116, // Client id
        0, 3, // username length
        12, 13, 14, // username
        0, 3, // password length
        15, 16, 17 //password
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.setPacketEncoding('binary');

      this.conn.once('connect', function(packet) {
        packet.username.toString('hex').should.eql(expected.username.toString('hex'));
        packet.password.toString('hex').should.eql(expected.password.toString('hex'));
        done();
      });
    });

    it('should handle binary will payload', function(done) {
      var expected = {
        cmd: "connect",
        retain: false,
        qos: 0,
        dup: false,
        length: 54,
        protocolId: "MQIsdp",
        protocolVersion: 3,
        will: {
          retain: true,
          qos: 2,
          topic: "topic",
          payload: new Buffer([18, 19, 20])
        },
        clean: true,
        keepalive: 30,
        clientId: "test",
        username: "username",
        password: "password"
      };

      var fixture = [
        16, 50, // Header
        0, 6, // Protocol id length
        77, 81, 73, 115, 100, 112, // Protocol id
        3, // Protocol version
        246, // Connect flags
        0, 30, // Keepalive
        0, 4, // Client id length
        116, 101, 115, 116, // Client id
        0, 5, // will topic length
        116, 111, 112, 105, 99, // will topic
        0, 3, // will payload length
        18, 19, 20, // will payload
        0, 8, // username length
        117, 115, 101, 114, 110, 97, 109, 101, // username
        0, 8, // password length
        112, 97, 115, 115, 119, 111, 114, 100 //password
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.setPacketEncoding('binary');

      this.conn.once('connect', function(packet) {
        packet.will.payload.toString('hex').should.eql(expected.will.payload.toString('hex'));
        done();
      });
    });


    describe('parse errors', function() {
      it('should say protocol not parseable', function(done) {
        var fixture = [
          16, 4,
          0, 6,
          77, 81
        ];

        this.stream.write(new Buffer(fixture));
        this.conn.once('error', function(err) {
          err.message.should.match(/cannot parse protocol id/);
          done();
        });
      });
    });
  });

  describe('connack', function() {
    it('should fire a connack event (rc = 0)', function(done) {
      var expected = {
        cmd: 'connack',
        retain: false,
        qos: 0,
        dup: false,
        length: 2,
        returnCode: 0
      }

      var fixture = [32, 2, 0, 0];

      this.stream.write(new Buffer(fixture));

      this.conn.once('connack', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });

    it('should fire a connack event (rc = 5)', function(done) {
      var expected = {
        cmd: 'connack',
        retain: false,
        qos: 0,
        dup: false,
        length: 2,
        returnCode: 5
      }

      var fixture = [32, 2, 0, 5];

      this.stream.write(new Buffer(fixture));

      this.conn.once('connack', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('publish', function() {
    it('should fire a publish event (minimal)', function(done) {
      var expected = {
        cmd: "publish",
        retain: false,
        qos: 0,
        dup: false,
        length: 10,
        topic: "test",
        payload: "test"
      };

      var fixture = [
        48, 10, // Header
        0, 4, // Topic length
        116, 101, 115, 116, // Topic (test)
        116, 101, 115, 116 // Payload (test)
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('publish', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });

    it('should fire a publish event with 2KB payload', function(done) {
      var expected = {
        cmd: "publish",
        retain: false,
        qos: 0,
        dup: false,
        length: 2054,
        topic: "test",
        payload: new Buffer(2048)
      };

      var fixture = new Buffer([
        48, 134, 16, // Header
        0, 4, // Topic length
        116, 101, 115, 116, // Topic (test)
      ]);

      fixture = Buffer.concat([fixture, expected.payload]);

      this.conn.setPacketEncoding('binary');
      this.stream.write(fixture);

      this.conn.once('publish', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });

    it('should fire a publish event with 2MB payload', function(done) {
      var expected = {
        cmd: "publish",
        retain: false,
        qos: 0,
        dup: false,
        length: 6 + 2 * 1024 * 1024,
        topic: "test",
        payload: new Buffer(2 * 1024 * 1024)
      };

      var fixture = new Buffer([
        48, 134, 128, 128, 1, // Header
        0, 4, // Topic length
        116, 101, 115, 116, // Topic (test)
      ]);

      fixture = Buffer.concat([fixture, expected.payload]);

      this.conn.setPacketEncoding('binary');
      this.stream.write(fixture);

      this.conn.once('publish', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });

    it('should fire a publish event (maximal)', function (done) {
      var expected = {
        cmd:"publish",
        retain: true,
        qos: 2,
        length: 12,
        dup: true,
        topic: "test",
        messageId: 10,
        payload: "test"
      };

      var fixture = [
        61, 12, // Header
        0, 4, // Topic length
        116, 101, 115, 116, // Topic
        0, 10, // Message id
        116, 101, 115, 116 // Payload
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('publish', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });

    it('should fire an empty publish', function(done) {
      var expected = {
        cmd: "publish",
        retain: false,
        qos: 0,
        dup: false,
        length: 6,
        topic: "test",
        payload: ""
      };

      var fixture = [
        48, 6, // Header
        0, 4, // Topic length
        116, 101, 115, 116 // Topic
        // Empty payload
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('publish', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });

    it('should parse a splitted publish', function(done) {
      var expected = {
        cmd: "publish",
        retain: false,
        qos: 0,
        dup: false,
        length: 10,
        topic: "test",
        payload: "test"
      };

      var fixture1 = [
        48, 10, // Header
        0, 4, // Topic length
        116, 101, 115, 116 // Topic (test)
      ];

      var fixture2 = [
        116, 101, 115, 116 // Payload (test)
      ];

      this.stream.write(new Buffer(fixture1));
      this.stream.write(new Buffer(fixture2));

      this.conn.once('publish', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('puback', function() {
    it('should fire a puback event', function(done) {
      var expected = {
        cmd: 'puback',
        retain: false,
        qos: 0,
        dup: false,
        length: 2,
        messageId: 2
      };

      var fixture = [
        64, 2, // Header
        0, 2 // Message id
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('puback', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('pubrec', function() {
    it('should fire a pubrec event', function(done) {
      var expected = {
        cmd: 'pubrec',
        retain: false,
        qos: 0,
        dup: false,
        length: 2,
        messageId: 3
      };

      var fixture = [
        80, 2, // Header
        0, 3 // Message id
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('pubrec', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('pubrel', function() {
    it('should fire a pubrel event', function(done) {
      var expected = {
        cmd: 'pubrel',
        retain: false,
        qos: 0,
        dup: false,
        length: 2,
        messageId: 4
      };

      var fixture = [
        96, 2, // Header
        0, 4 // Message id
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('pubrel', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('pubcomp', function() {
    it('should fire a pubcomp event', function(done) {
      var expected = {
        cmd: 'pubcomp',
        retain: false,
        qos: 0,
        dup: false,
        length: 2,
        messageId: 5
      };

      var fixture = [
        112, 2, // Header
        0, 5 // Message id
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('pubcomp', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('subscribe', function() {
    it('should fire a subscribe event (1 topic)', function (done) {
      var expected = {
        cmd: 'subscribe',
        retain: false,
        qos: 1,
        dup: false,
        length: 9,
        subscriptions: [
          {
            topic: "test",
            qos: 0
          }
        ],
        messageId: 6
      };

      var fixture = [
        130, 9, // Header (publish, qos=1, length=9)
        0, 6, // message id (6)
        0, 4, // topic length,
        116, 101, 115, 116, // Topic (test)
        0 // qos (0)
      ];
      this.stream.write(new Buffer(fixture));

      this.conn.once('subscribe', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });

    it('should fire a subscribe event (3 topic)', function (done) {
      var expected = {
        cmd: 'subscribe',
        retain: false,
        qos: 1,
        dup: false,
        length: 23,
        subscriptions: [
          {
            topic: "test",
            qos: 0
          },{
            topic: "uest",
            qos: 1
          },{
            topic: "tfst",
            qos: 2
          }
        ],
        messageId: 6
      };

      var fixture = [
        130, 23, // Header (publish, qos=1, length=9)
        0, 6, // message id (6)
        0, 4, // topic length,
        116, 101, 115, 116, // Topic (test)
        0, // qos (0)
        0, 4, // topic length
        117, 101, 115, 116, // Topic (uest)
        1, // qos (1)
        0, 4, // topic length
        116, 102, 115, 116, // Topic (tfst)
        2 // qos (2)
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('subscribe', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('suback', function() {
    it('should fire a suback event', function(done) {
      var expected = {
        cmd: 'suback',
        retain: false,
        qos: 0,
        dup: false,
        length: 6,
        granted: [0, 1, 2, 128],
        messageId: 6
      };

      var fixture = [
        144, 6, // Header
        0, 6, // Message id
        0, 1, 2, 128 // Granted qos (0, 1, 2) and a rejected being 0x80
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('suback', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('unsubscribe', function() {
    it('should fire an unsubscribe event', function(done) {
      var expected = {
        cmd: 'unsubscribe',
        retain: false,
        qos: 1,
        dup: false,
        length: 14,
        unsubscriptions: [
          'tfst',
          'test'
        ],
        messageId: 7
      }

      var fixture = [
        162, 14,
        0, 7, // message id (7)
        0, 4, // topic length
        116, 102, 115, 116, // Topic (tfst)
        0, 4, // topic length,
        116, 101, 115, 116, // Topic (test)
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('unsubscribe', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('unsuback', function() {
    it('should fire a unsuback event', function(done) {
      var expected = {
        cmd: 'unsuback',
        retain: false,
        qos: 0,
        dup: false,
        length: 2,
        messageId: 8
      };

      var fixture = [
        176, 2, // Header
        0, 8 // Message id
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('unsuback', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('pingreq', function() {
    it('should fire a pingreq event', function(done) {
      var expected = {
        cmd: 'pingreq',
        retain: false,
        qos: 0,
        dup: false,
        length: 0,
      };

      var fixture = [
        192, 0 // Header
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('pingreq', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('pingresp', function() {
    it('should fire a pingresp event', function(done) {
      var expected = {
        cmd: 'pingresp',
        retain: false,
        qos: 0,
        dup: false,
        length: 0,
      };

      var fixture = [
        208, 0 // Header
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('pingresp', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('disconnect', function() {
    it('should fire a disconnect event', function(done) {
      var expected = {
        cmd: 'disconnect',
        retain: false,
        qos: 0,
        dup: false,
        length: 0,
      };

      var fixture = [
        224, 0 // Header
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('disconnect', function(packet) {
        packet.should.eql(expected);
        done();
      });
    });
  });

  describe('reserverd (15)', function() {
    it('should emit an error', function(done) {
      var fixture = [
        240, 0 // Header
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('error', function(err) {
        done();
      });
    });
  });

  describe('reserverd (0)', function() {
    it('should emit an error', function(done) {
      var fixture = [
        0, 0 // Header
      ];

      this.stream.write(new Buffer(fixture));

      this.conn.once('error', function(err) {
        done();
      });
    });
  });
};
