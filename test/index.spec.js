'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var RefreshableCache = require('../index.js');

chai.use(require('sinon-chai'));


describe('node-cache', function() {
  var clock;
  var emittedEvents;
  var cache = new RefreshableCache();

  beforeEach(function() {
    // Mock the cache's emit() method to add the emitted events to an emittedEvents array
    emittedEvents = [];
    sinon.stub(cache, 'emit', function(eventName, key, value) {
      emittedEvents.push({
        eventName: eventName,
        key: key,
        value: value
      });
    });

    clock = sinon.useFakeTimers();

    cache.clear();
    cache.resetExpiryOnAccess(false);
  });

  afterEach(function() {
    clock.restore();

    if (cache.emit.restore) {
      cache.emit.restore();
    }
  });


  describe('initialization', function() {
    it('should use a new cache for each new instance', function() {
      var cache2 = new RefreshableCache();
      cache.put('key', 'value');
      expect(cache2.get('key')).to.be.null;
    });
  });


  describe('put()', function() {
    it('should allow adding a new item to the cache', function() {
      expect(function() {
        cache.put('key', 'value');
      }).to.not.throw();
    });

    it('should allow adding a new item to the cache with an expiration timeout and no refresh interval', function() {
      expect(function() {
        cache.put('key', 'value', 100);
      }).to.not.throw();
    });

    it('should allow adding a new item to the cache with a refresh interval and no expiration timeout', function() {
      expect(function() {
        cache.put('key', 'value', undefined, 10);
      }).to.not.throw();
    });

    it('should allow adding a new item to the cache with both refresh and expiration timeouts', function() {
      expect(function() {
        cache.put('key', 'value', 100, 10);
      }).to.not.throw();
    });

    it('should throw an error given a non-numeric expiration timeout', function() {
      expect(function() {
        cache.put('key', 'value', 'foo');
      }).to.throw();
    });

    it('should throw an error given an expiration timeout of NaN', function() {
      expect(function() {
        cache.put('key', 'value', NaN);
      }).to.throw();
    });

    it('should throw an error given an expiration timeout of 0', function() {
      expect(function() {
        cache.put('key', 'value', 0);
      }).to.throw();
    });

    it('should throw an error given a negative expiration timeout', function() {
      expect(function() {
        cache.put('key', 'value', -100);
      }).to.throw();
    });

    it('should throw an error given a non-numeric refresh interval', function() {
      expect(function() {
        cache.put('key', 'value', undefined, 'foo');
      }).to.throw();
    });

    it('should throw an error given an refresh interval of NaN', function() {
      expect(function() {
        cache.put('key', 'value', undefined, NaN);
      }).to.throw();
    });

    it('should throw an error given an refresh interval of 0', function() {
      expect(function() {
        cache.put('key', 'value', undefined, 0);
      }).to.throw();
    });

    it('should throw an error given a negative refresh interval', function() {
      expect(function() {
        cache.put('key', 'value', undefined, -100);
      }).to.throw();
    });

    it('should emit a "expiry" event once the cache key expires', function() {
      cache.put('key', 'value', 1000);
      clock.tick(999);
      expect(emittedEvents).to.deep.equal([]);
      clock.tick(1);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'expiry', key: 'key', value: 'value' }
      ]);
    });

    it('should emit a "refresh" event every time the refresh interval passes', function() {
      cache.put('key', 'value', undefined, 10);
      clock.tick(9);
      expect(emittedEvents).to.deep.equal([]);
      clock.tick(21);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'refresh', key: 'key', value: 'value' },
        { eventName: 'refresh', key: 'key', value: 'value' },
        { eventName: 'refresh', key: 'key', value: 'value' }
      ]);
    });

    it('should emit "expiry" and "refresh" events together', function() {
      cache.put('key', 'value', 15, 10);
      clock.tick(15);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'refresh', key: 'key', value: 'value' },
        { eventName: 'expiry', key: 'key', value: 'value' }
      ]);
    });

    it('should only emit a single "expiry" event', function() {
      cache.put('key', 'value', 1000);
      clock.tick(999);
      expect(emittedEvents).to.deep.equal([]);
      clock.tick(1);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'expiry', key: 'key', value: 'value' }
      ]);
      clock.tick(1000);
      expect(emittedEvents).to.have.length(1);
    });

    it('should stop emitting a "refresh" event once the cache key expires', function() {
      cache.put('key', 'value', 25, 10);
      clock.tick(50);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'refresh', key: 'key', value: 'value' },
        { eventName: 'refresh', key: 'key', value: 'value' },
        { eventName: 'expiry', key: 'key', value: 'value' }
      ]);
    });

    it('should override the duration on a new put() with a new specified duration', function() {
      cache.put('key', 'value1', 1000);
      clock.tick(999);
      cache.put('key', 'value2', 1000);
      clock.tick(1);
      expect(emittedEvents).to.deep.equal([]);
      clock.tick(1000);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'expiry', key: 'key', value: 'value2' }
      ]);
    });

    it('should override the duration on a new put() with a new specified duration for a key with a falsy value', function() {
      cache.put('key', false, 1000);
      clock.tick(999);
      cache.put('key', 'value2', 1000);
      clock.tick(1);
      expect(emittedEvents).to.deep.equal([]);
      clock.tick(1000);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'expiry', key: 'key', value: 'value2' }
      ]);
    });

    it('should not override the duration on a new put() without a new specified duration', function() {
      cache.put('key', 'value1', 1000);
      clock.tick(999);
      cache.put('key', 'value2');
      clock.tick(1);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'expiry', key: 'key', value: 'value2' }
      ]);
      clock.tick(1000);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'expiry', key: 'key', value: 'value2' }
      ]);
    });

    it('should not override the duration on a new put() without a new specified duration for a key with a falsy value', function() {
      cache.put('key', false, 1000);
      clock.tick(999);
      cache.put('key', 'value2');
      clock.tick(1);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'expiry', key: 'key', value: 'value2' }
      ]);
      clock.tick(1000);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'expiry', key: 'key', value: 'value2' }
      ]);
    });

    it('should not override the duration on a new put() with a new specified refresh interval', function() {
      cache.put('key', 'value1', 1000);
      clock.tick(999);
      cache.put('key', 'value2', undefined, 100);
      clock.tick(1);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'expiry', key: 'key', value: 'value2' }
      ]);
    });

    it('should not override the duration on a new put() with a new specified refresh interval for a key with a falsy value', function() {
      cache.put('key', false, 1000);
      clock.tick(999);
      cache.put('key', 'value2', undefined, 100);
      clock.tick(1);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'expiry', key: 'key', value: 'value2' }
      ]);
    });

    it('should override the refresh interval on a new put() with a new specified refresh interval', function() {
      cache.put('key', 'value1', undefined, 10);
      clock.tick(5);
      cache.put('key', 'value2', undefined, 10);
      clock.tick(5);
      expect(emittedEvents).to.deep.equal([]);
      clock.tick(5);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'refresh', key: 'key', value: 'value2' }
      ]);
    });

    it('should override the refresh interval on a new put() with a new specified refresh interval for a key with a falsy value', function() {
      cache.put('key', false, undefined, 10);
      clock.tick(5);
      cache.put('key', 'value2', undefined, 10);
      clock.tick(5);
      expect(emittedEvents).to.deep.equal([]);
      clock.tick(5);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'refresh', key: 'key', value: 'value2' }
      ]);
    });

    it('should not override the refresh interval on a new put() without a new specified refresh interval', function() {
      cache.put('key', 'value1', undefined, 10);
      clock.tick(5);
      cache.put('key', 'value2');
      clock.tick(5);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'refresh', key: 'key', value: 'value2' }
      ]);
    });

    it('should not override the refresh interval on a new put() without a new specified refresh interval for a key with a falsy value', function() {
      cache.put('key', false, undefined, 10);
      clock.tick(5);
      cache.put('key', 'value2');
      clock.tick(5);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'refresh', key: 'key', value: 'value2' }
      ]);
    });

    it('should not override the refresh interval on a new put() with a new specified duration', function() {
      cache.put('key', 'value1', undefined, 10);
      clock.tick(5);
      cache.put('key', 'value2', 100);
      clock.tick(5);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'refresh', key: 'key', value: 'value2' }
      ]);
    });

    it('should not override the refresh interval on a new put() with a new specified duration for a key with a falsy value', function() {
      cache.put('key', false, undefined, 10);
      clock.tick(5);
      cache.put('key', 'value2', 100);
      clock.tick(5);
      expect(emittedEvents).to.deep.equal([
        { eventName: 'refresh', key: 'key', value: 'value2' }
      ]);
    });

    it('should cancel the expiration timeout after deleting a cache key which was overridden without a new specified expiration timeout', function() {
      cache.put('key', 'value1', 100);
      clock.tick(5);
      cache.put('key', 'value2');
      cache.del('key');
      clock.tick(95);
      expect(emittedEvents).to.deep.equal([]);
    });

    it('should cancel the refresh interval after deleting a cache key which was overridden without a new specified refresh interval', function() {
      cache.put('key', 'value1', undefined, 10);
      clock.tick(5);
      cache.put('key', 'value2');
      cache.del('key');
      clock.tick(5);
      expect(emittedEvents).to.deep.equal([]);
    });

    it('should cancel the expiration timeout and refresh interval after deleting a cache key which was overridden without a new specified expiration timeout or refresh interval', function() {
      cache.put('key', 'value1', 100, 10);
      clock.tick(5);
      cache.put('key', 'value2');
      cache.del('key');
      clock.tick(95);
      expect(emittedEvents).to.deep.equal([]);
    });

    it('should return the cached value', function() {
      expect(cache.put('key', 'value')).to.equal('value');
    });
  });


  describe('get()', function() {
    it('should return null given an empty cache', function() {
      expect(cache.get('miss')).to.be.null;
    });

    it('should return null given a key not in a non-empty cache', function() {
      cache.put('key', 'value');
      expect(cache.get('miss')).to.be.null;
    });

    it('should return the corresponding value of a key in the cache', function() {
      cache.put('key', 'value');
      expect(cache.get('key')).to.equal('value');
    });

    it('should return the latest corresponding value of a key in the cache', function() {
      cache.put('key', 'value1');
      cache.put('key', 'value2');
      cache.put('key', 'value3');
      expect(cache.get('key')).to.equal('value3');
    });

    it('should handle various types of cache keys', function() {
      var keys = [null, undefined, NaN, true, false, 0, 1, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '', 'a', [], {}, [1, 'a', false], { a: 1, b: 'a', c: false}, function() {}];
      keys.forEach(function(key, index) {
        var value = 'value' + index;
        cache.put(key, value);
        expect(cache.get(key)).to.deep.equal(value);
      });
    });

    it('should handle various types of cache values', function() {
      var values = [null, undefined, NaN, true, false, 0, 1, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '', 'a', [], {}, [1, 'a', false], { a: 1, b: 'a', c: false}, function() {}];
      values.forEach(function(value, index) {
        var key = 'key' + index;
        cache.put(key, value);
        expect(cache.get(key)).to.deep.equal(value);
      });
    });

    it('should never expire given no expiration time', function() {
      cache.put('key', 'value');
      clock.tick(100000);
      expect(cache.get('key')).to.equal('value');
    });

    it('should return the corresponding value of a non-expired key in the cache', function() {
      cache.put('key', 'value', 1000);
      clock.tick(999);
      expect(cache.get('key')).to.equal('value');
    });

    it('should return null given an expired key', function() {
      cache.put('key', 'value', 1000);
      clock.tick(1000);
      expect(cache.get('key')).to.be.null;
    });

    it('should return null given a key which is a property on the Object prototype', function() {
      expect(cache.get('toString')).to.be.null;
    });

    it('should allow reading the value for a key which is a property on the Object prototype', function() {
      cache.put('toString', 'value');
      expect(cache.get('toString')).to.equal('value');
    });
  });


  describe('del()', function() {
    it('should return false given an empty cache', function() {
      expect(cache.del('miss')).to.be.false;
    });

    it('should return false given a key not in a non-empty cache', function() {
      cache.put('key', 'value');
      expect(cache.del('miss')).to.be.false;
    });

    it('should return true given a key in the cache', function() {
      cache.put('key', 'value');
      expect(cache.del('key')).to.be.true;
    });

    it('should remove the provided key from the cache', function() {
      cache.put('key', 'value');
      expect(cache.get('key')).to.equal('value');
      expect(cache.del('key')).to.be.true;
      expect(cache.get('key')).to.be.null;
    });

    it('should decrement the cache size by 1', function() {
      cache.put('key', 'value');
      expect(cache.size()).to.equal(1);
      expect(cache.del('key')).to.be.true;
      expect(cache.size()).to.equal(0);
    });

    it('should not remove other keys in the cache', function() {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      expect(cache.get('key1')).to.equal('value1');
      expect(cache.get('key2')).to.equal('value2');
      expect(cache.get('key3')).to.equal('value3');
      cache.del('key1');
      expect(cache.get('key1')).to.be.null;
      expect(cache.get('key2')).to.equal('value2');
      expect(cache.get('key3')).to.equal('value3');
    });

    it('should only delete a key from the cache once even if called multiple times in a row', function() {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      expect(cache.size()).to.equal(3);
      cache.del('key1');
      cache.del('key1');
      cache.del('key1');
      expect(cache.size()).to.equal(2);
    });

    it('should handle deleting keys which were previously deleted and then re-added to the cache', function() {
      cache.put('key', 'value');
      expect(cache.get('key')).to.equal('value');
      cache.del('key');
      expect(cache.get('key')).to.be.null;
      cache.put('key', 'value');
      expect(cache.get('key')).to.equal('value');
      cache.del('key');
      expect(cache.get('key')).to.be.null;
    });

    it('should return true given an non-expired key', function() {
      cache.put('key', 'value', 1000);
      clock.tick(999);
      expect(cache.del('key')).to.be.true;
    });

    it('should return false given an expired key', function() {
      cache.put('key', 'value', 1000);
      clock.tick(1000);
      expect(cache.del('key')).to.be.false;
    });

    it('should cancel the "expiry" event for the deleted key', function() {
      cache.put('key', 'value', 1000);
      cache.del('key');
      clock.tick(1000);
      expect(emittedEvents).to.have.length(0);
    });

    it('should cancel the "refresh" events for the deleted key', function() {
      cache.put('key', 'value', undefined, 10);
      cache.del('key');
      clock.tick(1000);
      expect(emittedEvents).to.have.length(0);
    });

    it('should cancel the "expiry" event for the deleted key whose value was falsy', function() {
      cache.put('key', false, 1000);
      cache.del('key');
      clock.tick(1000);
      expect(emittedEvents).to.have.length(0);
    });

    it('should cancel the "refresh" events for the deleted key whose value was falsy', function() {
      cache.put('key', false, undefined, 10);
      cache.del('key');
      clock.tick(1000);
      expect(emittedEvents).to.have.length(0);
    });
  });


  describe('clear()', function() {
    it('should have no effect given an empty cache', function() {
      expect(cache.size()).to.equal(0);
      cache.clear();
      expect(cache.size()).to.equal(0);
    });

    it('should remove all existing keys in the cache', function() {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      expect(cache.size()).to.equal(3);
      cache.clear();
      expect(cache.size()).to.equal(0);
    });

    it('should remove the keys in the cache', function() {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      expect(cache.get('key1')).to.equal('value1');
      expect(cache.get('key2')).to.equal('value2');
      expect(cache.get('key3')).to.equal('value3');
      cache.clear();
      expect(cache.get('key1')).to.be.null;
      expect(cache.get('key2')).to.be.null;
      expect(cache.get('key3')).to.be.null;
    });

    it('should reset the cache size to 0', function() {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      expect(cache.size()).to.equal(3);
      cache.clear();
      expect(cache.size()).to.equal(0);
    });

    it('should cancel the "expiry" events for the deleted keys', function() {
      cache.put('key1', 'value1', 1000);
      cache.put('key2', 'value2', 1000);
      cache.put('key3', 'value3', 1000);
      cache.clear();
      clock.tick(1000);
      expect(emittedEvents).to.have.length(0);
    });

    it('should cancel the "refresh" events for the deleted keys', function() {
      cache.put('key', 'value', undefined, 10);
      cache.clear();
      clock.tick(1000);
      expect(emittedEvents).to.have.length(0);
    });

    it('should cancel the "expiry" event for a deleted key whose value was falsy', function() {
      cache.put('key', false, 1000);
      cache.clear();
      clock.tick(1000);
      expect(emittedEvents).to.have.length(0);
    });

    it('should cancel the "refresh" events for a deleted key whose value was falsy', function() {
      cache.put('key', false, undefined, 10);
      cache.clear();
      clock.tick(1000);
      expect(emittedEvents).to.have.length(0);
    });
  });


  describe('size()', function() {
    it('should return 0 given an empty cache', function() {
      expect(cache.size()).to.equal(0);
    });

    it('should return 1 after adding a single item to the cache', function() {
      cache.put('key', 'value');
      expect(cache.size()).to.equal(1);
    });

    it('should return 3 after adding three items to the cache', function() {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      expect(cache.size()).to.equal(3);
    });

    it('should not multi-count duplicate items added to the cache', function() {
      cache.put('key', 'value1');
      expect(cache.size()).to.equal(1);
      cache.put('key', 'value2');
      expect(cache.size()).to.equal(1);
    });

    it('should update when a key in the cache expires', function() {
      cache.put('key', 'value', 1000);
      expect(cache.size()).to.equal(1);
      clock.tick(999);
      expect(cache.size()).to.equal(1);
      clock.tick(1);
      expect(cache.size()).to.equal(0);
    });
  });


  describe('keys()', function() {
    it('should return an empty array given an empty cache', function() {
      expect(cache.keys()).to.deep.equal([]);
    });

    it('should return a single key after adding a single item to the cache', function() {
      cache.put('key', 'value');
      expect(cache.keys()).to.deep.equal(['key']);
    });

    it('should return 3 keys after adding three items to the cache', function() {
      cache.put('key1', 'value1');
      cache.put('key2', 'value2');
      cache.put('key3', 'value3');
      expect(cache.keys()).to.deep.equal(['key1', 'key2', 'key3']);
    });

    it('should not multi-count duplicate items added to the cache', function() {
      cache.put('key', 'value1');
      expect(cache.keys()).to.deep.equal(['key']);
      cache.put('key', 'value2');
      expect(cache.keys()).to.deep.equal(['key']);
    });

    it('should update when a key in the cache expires', function() {
      cache.put('key', 'value', 1000);
      expect(cache.keys()).to.deep.equal(['key']);
      clock.tick(999);
      expect(cache.keys()).to.deep.equal(['key']);
      clock.tick(1);
      expect(cache.keys()).to.deep.equal([]);
    });
  });


  describe('on()', function() {
    beforeEach(function() {
      cache.emit.restore();
    });

    it('should fire a callback when an "expiry" event is emitted', function() {
      var spy = sinon.spy();
      cache.on('expiry', spy);
      cache.put('key', 'value', 1000);
      clock.tick(1000);
      expect(spy).to.have.been.calledOnce.and.calledWith('key', 'value');
    });

    it('should fire a callbacks when "refresh" events are emitted', function() {
      var spy = sinon.spy();
      cache.on('refresh', spy);
      cache.put('key', 'value', undefined, 10);
      clock.tick(25);
      expect(spy).to.have.been.calledTwice.and.calledWith('key', 'value');
    });

    it('should fire callbacks when "expiry" and "refresh" events are emitted together', function() {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      cache.on('expiry', spy1);
      cache.on('refresh', spy2);
      cache.put('key', 'value', 25, 10);
      clock.tick(25);
      expect(spy1).to.have.been.calledOnce.and.calledWith('key', 'value');
      expect(spy2).to.have.been.calledTwice.and.calledWith('key', 'value');
    });
  });


  describe('resetExpiryOnAccess()', function() {
    it('should throw error given a non-boolean', function() {
      expect(function() {
        cache.resetExpiryOnAccess('foo');
      }).to.throw('Reset expiry on get flag must be a boolean');
    });

    it('should not reset the expiration timeout by default', function() {
      cache.put('key', 'value', 1000);
      clock.tick(500);
      cache.get('key');
      clock.tick(500);
      expect(emittedEvents).to.have.length(1);
    });

    it('should reset the expiration timeout when called with no arguments', function() {
      cache.resetExpiryOnAccess();
      cache.put('key', 'value', 1000);
      clock.tick(500);
      cache.get('key');
      clock.tick(500);
      expect(emittedEvents).to.have.length(0);
    });

    it('should reset the expiration timeout when called with true', function() {
      cache.resetExpiryOnAccess(true);
      cache.put('key', 'value', 1000);
      clock.tick(500);
      cache.get('key');
      clock.tick(500);
      expect(emittedEvents).to.have.length(0);
    });

    it('should not reset the expiration timeout when called with false', function() {
      cache.resetExpiryOnAccess(false);
      cache.put('key', 'value', 1000);
      clock.tick(500);
      cache.get('key');
      clock.tick(500);
      expect(emittedEvents).to.have.length(1);
    });

    it('should allow toggling whether or not to reset the expiration timeout', function() {
      cache.resetExpiryOnAccess(true);
      cache.put('key', 'value', 1000);
      clock.tick(500);
      cache.get('key');
      clock.tick(500);
      expect(emittedEvents).to.have.length(0);
      cache.resetExpiryOnAccess(false);
      cache.get('key');
      clock.tick(500);
      expect(emittedEvents).to.have.length(1);
    });
  });
});
