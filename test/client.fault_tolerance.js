var should = require('should')
  , mqtt   = require('../lib/mqtt');

describe('Fault tolerance', function () {

  describe('reconnecting', function () {
    it('should attempt to reconnect once server is down', function (done) {
      this.timeout(15000);

      var fork   = require('child_process').fork;
      var server = fork(__dirname + '/helpers/server_process.js');

      var client = mqtt.createClient('3000', 'localhost', { keepalive: 1 });

      client.once('connect', function () {
        server.kill('SIGINT'); // mocks server shutdown

        client.once('close', function () {
          should.exist(client.reconnectTimer);
          done();
        });
      });
    });
  });

});
