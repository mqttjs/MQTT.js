
var should = require('should')
  , mqtt = require("../")
  , Store = require("../lib/store");

describe("inflight store", function() {
  var store;

  beforeEach(function() {
    store = new Store();
  });

  it("should put and stream in-flight packets", function(done) {
    var packet = {
      topic: "hello",
      payload: "world",
      qos: 1,
      messageId: 42
    };

    store.put(packet, function() {
      store
        .createStream()
        .on('data', function(data) {
          data.should.equal(packet)
          done()
        })
    })
  });

  it("should add and del in-flight packets", function(done) {
    var packet = {
      topic: "hello",
      payload: "world",
      qos: 1,
      messageId: 42
    };

    store.put(packet, function() {
      store.del(packet, function() {
        store
          .createStream()
          .on("data", function(data) {
            done(new Error("this should never happen"));
          })
          .on("end", done);
      });
    });
  });

  it("should replace a packet when doing put with the same messageId", function(done) {
    var packet1 = {
      topic: "hello",
      payload: "world",
      qos: 2,
      messageId: 42
    };

    var packet2 = {
      qos: 2,
      messageId: 42
    };

    store.put(packet1, function() {
      store.put(packet2, function() {
        store
          .createStream()
          .on('data', function(data) {
            data.should.equal(packet2)
            done()
          });
      });
    });
  });

  it("should return the original packet on del", function(done) {
    var packet = {
      topic: "hello",
      payload: "world",
      qos: 1,
      messageId: 42
    };

    store.put(packet, function() {
      store.del({ messageId: 42 }, function(err, deleted) {
        deleted.should.equal(packet);
        done();
      });
    });
  });

  it("should get a packet with the same messageId", function(done) {
    var packet = {
      topic: "hello",
      payload: "world",
      qos: 1,
      messageId: 42
    };

    store.put(packet, function() {
      store.get({ messageId: 42 }, function(err, fromDb) {
        fromDb.should.equal(packet);
        done();
      });
    });
  });
});
