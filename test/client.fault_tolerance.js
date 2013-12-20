var should = require('should'),
    mqtt   = require('../lib/mqtt');

describe('Fault tolerance', function () {

  describe('reconnect', function () {
    it('should attempt to reconnect once server is down', function (done) {
      this.timeout(15000);

      var fork   = require('child_process').fork;
      var server = fork(__dirname + '/helpers/server_process.js');

      var client = mqtt.createClient('3000', 'localhost', {
        keepalive: 2 // times 600 ms
      });

      client.on('connect', function () {
        should.not.exist(client.reconnectTimer);
        should(server.kill('SIGINT')); // mocks server shutdown

        setTimeout(function () {
          should.exist(client.reconnectTimer); // client attempts to reconnect
          done();
        }, 2000);
      });
    });

//    it('should attempt to reconnect once network cable is unplugged', function (done) {
//      // TODO
//      done();
//    });
  });

});