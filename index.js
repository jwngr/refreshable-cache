'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');


function RefreshableCache() {
  EventEmitter.call(this);

  var _cache = Object.create(null);
  var _resetExpiryOnAccess = false;


  /**
   * Retrieves the value of the provided `key` from the cache. If the provided `key` is not in the
   * cache, `null` is returned.
   *
   * If the cache is set to reset expiry on cache access, the corresponding cache item's expiration
   * timeout will be reset.
   *
   * @param {string} key The key whose value to retrieve.
   * @return {*|null} The provided key's value, or `null` if the provided key is not in the cache.
   */
  this.get = function(key) {
    var self = this;

    var record = _cache[key];

    var value = null;
    if (typeof record !== 'undefined') {
      value = record.value;

      if (typeof record.duration !== 'undefined' && _resetExpiryOnAccess) {
        // Restart the expiration timeout
        clearTimeout(record.expirationTimeout);
        record.expirationTimeout = setTimeout(function() {
          self.emit('expiry', key, _cache[key].value);
          self.del(key);
        }, record.duration);
      }
    }

    return value;
  };


  /**
   * Removes the cache item corresponding to the provided key. If the provided key is not in the
   * cache, the operation is a no-op.
   *
   * Returns whether or not the key was removed from the cache.
   *
   * No further events will be emitted for the provided key.
   *
   * @param {string} key The key to remove.
   * @return {boolean} Whether or not the key was removed from the cache.
   */
  this.del = function(key) {
    var wasKeyDeleted = false;

    var oldRecord = _cache[key];
    if (typeof oldRecord !== 'undefined') {
      clearTimeout(oldRecord.expirationTimeout);
      clearInterval(oldRecord.refreshInterval);
      delete _cache[key];
      wasKeyDeleted = true;
    }

    return wasKeyDeleted;
  };


  /**
   * Sets the `value` of the provided `key` in the cache. If the `key` is not in the cache, it is
   * added; otherwise, its value is updated.
   *
   * For convenience, the `value` written to the cache is also returned.
   *
   * The cache item will be deleted after the optional `duration` time (in milliseconds) passes. At
   * that time, an `'expiry'` event will be emitted for the provided key.
   *
   * A `'refresh'` event will be emitted for the provided key after the optional `refreshInterval`
   * time (in milliseconds) passes.
   *
   * If no `duration` is specified for an existing cache item, its expiry will remain unchanged.
   * Similarly, if no `refreshInterval` is specified for an existing cache item, its refresh
   * interval will remain unchanged.
   *
   * @param {string} key The key whose value to write.
   * @param {*} value The value to write.
   * @param {number} [duration] Optional time, in milliseconds, indicating how long the key should remain in the cache.
   * @param {number} [refreshInterval] Optional interval, in milliseconds, indicating how often the 'refresh' event will be emitted.
   * @return {any} The value written to the cache.
   */
  this.put = function(key, value, duration, refreshInterval) {
    var self = this;

    if (typeof duration !== 'undefined' && (typeof duration !== 'number' || isNaN(duration) || duration <= 0)) {
      throw new Error('Expiration time must be a positive number');
    } else if (typeof refreshInterval !== 'undefined' && (typeof refreshInterval !== 'number' || isNaN(refreshInterval) || refreshInterval <= 0)) {
      throw new Error('Refresh time must be a positive number');
    }

    var oldRecord = _cache[key];

    // Copy the existing record's timeout and interval onto the new record; just update the record's value
    var newRecord = oldRecord || {};
    newRecord.value = value;

    if (typeof duration !== 'undefined') {
      if (typeof oldRecord !== 'undefined') {
        clearTimeout(oldRecord.expirationTimeout);
      }

      newRecord.duration = duration;
      newRecord.expirationTimeout = setTimeout(function() {
        self.emit('expiry', key, _cache[key].value);
        self.del(key);
      }, duration);
    }

    if (typeof refreshInterval !== 'undefined') {
      if (typeof oldRecord !== 'undefined') {
        clearInterval(oldRecord.refreshInterval);
      }

      newRecord.refreshInterval = setInterval(function() {
        self.emit('refresh', key, _cache[key].value);
      }, refreshInterval);
    }

    _cache[key] = newRecord;

    return value;
  };


  /**
   * Removes all items from the cache.
   *
   * No further events will be emitted for any existing keys.
   */
  this.clear = function() {
    this.keys().forEach(function(key) {
      var oldRecord = _cache[key];
      clearTimeout(oldRecord.expirationTimeout);
      clearInterval(oldRecord.refreshInterval);
    });

    _cache = Object.create(null);
  };


  /**
   * Sets whether or not the cache should reset a key's expiry when the key's value is accessed.
   *
   * @param {boolean} [shouldResetExpiry = true] Whether or not to reset the expiration timeout when the key's value is retrieved from the cache.
   */
  this.resetExpiryOnAccess = function(shouldResetExpiry) {
    if (typeof shouldResetExpiry !== 'undefined' && typeof shouldResetExpiry !== 'boolean') {
      throw new Error('Reset expiry on get flag must be a boolean');
    }

    _resetExpiryOnAccess = (typeof shouldResetExpiry === 'undefined') ? true : shouldResetExpiry;
  };


  /**
   * Returns the number of items in the cache.
   *
   * @return {number} The number of keys in the cache.
   */
  this.size = function() {
    return Object.keys(_cache).length;
  };


  /**
   * Returns an array of keys in the cache.
   *
   * @return {string[]} An array of keys in the cache.
   */
  this.keys = function() {
    return Object.keys(_cache);
  };
}

util.inherits(RefreshableCache, EventEmitter);

module.exports = RefreshableCache;
