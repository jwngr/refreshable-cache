# refreshable-cache

[![Build Status](https://travis-ci.org/jwngr/refreshable-cache.svg?branch=master)](https://travis-ci.org/jwngr/refreshable-cache)
[![GitHub version](https://badge.fury.io/gh/jwngr%2Frefreshable-cache.svg)](http://badge.fury.io/gh/jwngr%2Frefreshable-cache)

An in-memory, refreshable cache for Node.js. This cache has the following features:
* Optional time-based expiry on a per-item basis.
* Optional refresh intervals which allow you to update a cache item's value without resetting its
expiration time.
* Optional resetting of expiry whenever a cache item is accessed.


## Installation and Usage

The `refreshable-cache` module is available via `npm`:

```bash
$ npm install refreshable-cache --save
```

Once installed, a new cache can be created in your Node.js application as follows:

```js
var RefreshableCache = require('refreshable-cache');
var cache = new RefreshableCache();
```


## API Reference

### Methods

[`put(key, value[, duration, refreshInterval])`](#putkey-value-duration-refreshinterval)

[`get(key)`](#getkey)

[`del(key)`](#delkey)

[`clear()`](#clear)

[`on(eventName, callback)`](#oneventname-callback)

[`resetExpiryOnAccess([shouldResetExpiry = true])`](#resetexpiryonaccessshouldresetexpiry--true)

[`size()`](#size)

[`keys()`](#keys)


### `put(key, value[, duration, refreshInterval])`

**Arguments**

| Name | Type | Description |
| ---- | ---- | ----------- |
| `key` | `*` | The key whose value to write. |
| `value` | `*` | The value to write. |
| [*`duration`*] | `number` | Optional time, in milliseconds, indicating how long the key should remain in the cache. |
| [*`refreshInterval`*] | `number` | Optional interval, in milliseconds, indicating how often the 'refresh' event will be emitted. |

**Return Value**

| Type | Description |
| ---- | ----------- |
| `*` | The value written to the cache. |

**Description**

Sets the `value` of the provided `key` in the cache. If the `key` is not in the cache, it is added;
otherwise, its value is updated.

For convenience, the `value` written to the cache is also returned.

The cache item will be deleted after the optional `duration` time (in milliseconds) passes. At that
time, an `'expiry'` event will be emitted for the provided key.

A `'refresh'` event will be emitted for the provided key after the optional `refreshInterval` time
(in milliseconds) passes.

If no `duration` is specified for an existing cache item, its expiry will remain unchanged. Similarly, if no `refreshInterval` is specified for an existing cache item, its refresh interval will remain unchanged.

**Examples**

```
cache.put('He', 'Helium');  // Add a new cache item which never expires
```

```
cache.put('Fe', {
  name: 'Iron',
  number: 26
}, 5000);  // Add a new cache item which expires after 5 seconds
```

```
cache.put('Au', 'Gold', undefined, 1000);  // Add a new cache item which never expires and emits a 'refresh' event every second
```

```
cache.put('Pb', 'Lead', 5000, 1000);  // Add a new cache item which expires after 5 seconds and emits a 'refresh' event every second
```

### `get(key)`

**Arguments**

| Name | Type | Description |
| ---- | ---- | ----------- |
| `key` | `*` | The key whose value to retrieve. |

**Return Value**

| Type | Description |
| ---- | ----------- |
| `* | null` | The provided key's value, or `null` if the provided key is not in the cache. |

**Description**

Retrieves the value of the provided `key` from the cache. If the provided `key` is not in the cache,
`null` is returned.

If the cache is set to reset expiry on cache access, the corresponding cache item's expiration
timeout will be reset.

**Examples**

```
cache.put('Zr', 'Zirconium');
cache.get('Zr');  // 'Zirconium'
cache.get('Ag');  // null
```

```
cache.put('Cf', {
  name: 'Californium',
  number: 98
}, 1000);
cache.get('Cf');  // { name: 'Californium', number: 98 }

setTimeout(function() {
  cache.get('Cf');  // null (since the key has expired and been removed from the cache)
}, 2000);
```

### `del(key)`

**Arguments**

| Name | Type | Description |
| ---- | ---- | ----------- |
| `key` | `*` | The key whose value to remove. |

**Return Value**

| Type | Description |
| ---- | ----------- |
| `boolean` | Whether or not the provided key was removed from the cache. |

**Description**

Removes the cache item corresponding to the provided `key`.  If the provided `key` is not in the cache, the operation is a no-op.

Returns whether or not the key was removed from the cache.

No further events will be emitted for the provided `key`.

**Examples**

```
cache.put('Ar', 'Argon');
cache.get('Ar');  // 'Argon'
cache.del('Ar');  // true
cache.get('Ar');  // null (since the key is no longer in the cache)
cache.del('Ar');  // false (since the key is no longer in the cache)
```

### `clear()`

**Arguments**

None

**Return Value**

None

**Description**

Removes all items from the cache.

No further events will be emitted for any existing keys.

**Examples**

```
cache.put('O', 'Oxygen');
cache.put('S', {
  name: 'Sulfur',
  number: 16
});
cache.get('O');  // 'Oxygen'
cache.get('S');  // { name: 'Sulfur', number: 16 }
cache.clear();
cache.get('O');  // null
cache.get('S');  // null
```

### `on(eventName, callback)`

**Arguments**

| Name | Type | Description |
| ---- | ---- | ----------- |
| `eventName` | `string` | The name of the event for which to listen. |
| `callback` | `function` | The callback to fire when the provided event is emitted. |

**Return Value**

None

**Description**

Fires the provided `callback` when the `eventName` event is emitted from the cache. Valid event
names are `'expiry'` and `'refresh'`.

The `'expiry'` event is emitted when the item expires from the cache. It is emitted at most once per
cache item. If no duration is provided when a key is put into the cache, the `'expiry'` event will
not be emitted for it.

The `'refresh'` event is emitted on an interval as determined by the refresh interval specified when
the item was added to the cache. It can be emitted any number of times per cache item. If no refresh
interval is provided when a key is put into the cache, no `'refresh'` events will be emitted for it.

The `callback` fired when the events are emitted are passed the `key` and latest `value` for the
corresponding cache item.

**Examples**

```
cache.put('Sn', 'Tin', 1000);
cache.put('Pt', 'Platinum', 3000);
cache.on('expiry', function(key, value) {
  console.log('Cache item with "' + key + '"" expired and was removed from the cache');
});

setTimeout(function() {
  // At this point, the 'expiry' event has been emitted for 'Sn' but not for 'Pt'
}, 2000);
```

```
cache.put('Mn', 'Manganese', undefined, 100);
cache.put('U', 'Uranium', undefined, 400);
cache.on('refresh', function(key, value) {
  console.log('Cache item with ' + key + ' should be refreshed');
});

setTimeout(function() {
  // At this point, the 'refresh' event has been emitted 4 times for 'Mn' and 1 time for 'U'
}, 450);
```

### `resetExpiryOnAccess([shouldResetExpiry = true])`

**Arguments**

| Name | Type | Description |
| ---- | ---- | ----------- |
| [*`shouldResetExpiry`*] | `boolean` | Optional boolean indicating whether or not the cache should reset a key's expiry when the key's value is accessed. Defaults to `true`. |

**Return Value**

None

**Description**

Sets whether or not the cache should reset a key's expiry when the key's value is accessed. By
default, cache accesses do not reset the corresponding item's expiry.

If passed no arguments, `shouldResetExpiry` defaults to `true`.

**Examples**

```
cache.put('K', 'Potassium', 1000);
setTimeout(function() {
  cache.get('K');  // 'Potassium' (does not reset expiry)
  setTimeout(function() {
    cache.get('K');  // null (since expiry was not reset from the access above)
  }, 501);
}, 500);
```

```
cache.resetExpiryOnAcces();
cache.put('K', 'Potassium', 1000);
setTimeout(function() {
  cache.get('K');  // 'Potassium' (resets expiry)
  setTimeout(function() {
    cache.get('K');  // 'Potassium' (since expiry was reset from the access above)
  }, 501);
}, 500);
```

### `size()`

**Arguments**

None

**Return Value**

| Type | Description |
| ---- | ----------- |
| `number` | The number of items in the cache. |

**Description**

Returns the number of items in the cache.

**Examples**

```
cache.size();  // 0
cache.put('Pm', 'Promethium');
cache.put('Rf', {
  name: 'Rutherfordium',
  number: 104
});
cache.size();  // 2
cache.del('Rf');
cache.size();  // 1
cache.clear();
cache.size();  // 0
```

```
cache.put('W', 'Tungsten', 1000);
cache.size();  // 1

setTimeout(function() {
  cache.size();  // 0 (since the key has expired and been removed from the cache)
}, 2000);
```

### `keys()`

**Arguments**

None

**Return Value**

| Type | Description |
| ---- | ----------- |
| `string[]` | An array of keys in the cache. |

**Description**

Returns an array of keys in the cache.

**Examples**

```
cache.keys();  // []
cache.put('Ra', 'Radium');
cache.put('Nd', {
  name: 'Neodymium',
  number: 60
});
cache.keys();  // ['Ra', 'Nd']
cache.del('Nd');
cache.keys();  // ['Ra']
cache.clear();
cache.keys();  // []
```

```
cache.put('Yb', 'Ytterbium', 1000);
cache.keys();  // ['Yb']

setTimeout(function() {
  cache.keys();  // [] (since the key has expired and been removed from the cache)
}, 2000);
```


## Contributing

If you'd like to contribute to `refreshable-cache`, run the following commands to get
your environment set up:

```bash
$ git clone https://github.com/jwngr/refreshable-cache.git
$ cd refreshable-cache  # go to the refreshable-cache directory
$ npm install -g gulp   # globally install gulp task runner
$ npm install           # install local npm build / test dependencies
$ gulp                  # lint the source files and run the test suite
$ gulp watch            # watch for source file changes
```
