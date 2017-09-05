# @paybase/csp

Communicating Sequential Processes built on top of nodes `async/await`.

### Installation

```
$ npm install --save @paybase/csp
```

or

```
$ yarn add @paybase/csp
```

### Example Usage

Below is a trivial example of usage, that plays on the standard ping-pong example.

```javascript
const { channel, put, take } = require('@paybase/csp');

const wiff = channel();
const waff = channel();

const createBall = () => ({ hits: 0, status: '' });

const createBat = async (inbound, outbound) => {
  while (true) {
    const ball = await take(inbound); // wait for an incoming ball
    ball.hits++;
    ball.status = ball.status === 'wiff!' ? 'waff!' : 'wiff!';
    console.log(`🎾  Ball hit ${ball.hits} time(s), ${ball.status}`);
    await timeout(500); // assume its going to take a bit to hit the ball
    await put(outbound, ball); // smash the ball back
  }
};

createBat(waff, wiff); // create a bat that will wiff waffs
createBat(wiff, waff); // create a bat that will waff wiffs

put(waff, createBall());
```

![ping pong](/assets/pingpong.gif?raw=true)

### Methods

This library exposes 4 methods and one factory.

#### `channel()`

This factory method constructs a new `channel` and returns it. A channel contains no publicly accessible properties, but contains information about interactions with the `channel`.

```javascript
const chan = channel();
```

#### `put(channel, message)` -> `Promise`

The `put` method requires the `channel` on which to put the supplied `message`. The `put` method returns a `Promise` which can be optionally awaited and will resolve when something is ready to take the `message` from the `channel`.

```javascript
const chan = channel();
put(chan, 42);

// ...or...

await put(chan, 42);
```

#### `take(channel)` -> `Promise`

The `take` method requires the `channel` to take from. The `take` method returns a `Promise` which should always be awaited and will resolve with a message, when a message is available.

```javascript
const chan = channel();

put(chan, 42);

const msg = await take(chan); // will receive 42
```

#### `alts(...channels)` -> `Promise`

The `alts` method will race taking values from multiple `channels`.

```javascript
const chan1 = channel();
const chan2 = channel();

put(chan2, 42);
const msg = await alts(chan1, chan2); // will receive 42
```

#### `drain(channel)` -> `Promise`

The `drain` method requires a `channel` which it will drain all messages from until empty, returning an array of messages.

```javascript
const chan = channel();
put(chan, 42);
put(chan, 41);
put(chan, 40);
put(chan, 39);

const msgs = await drain(chan); // will receive [ 42, 41, 40, 39 ]
```
