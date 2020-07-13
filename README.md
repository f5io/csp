# @f5io/csp

A library for Communicating Sequential Processes in Node.js, built on top of `async/await` and `AsyncIterable`.

[![npm version](https://badge.fury.io/js/%40f5io%2Fcsp.svg)](https://badge.fury.io/js/%40f5io%2Fcsp)

## Installation

This library requires `async/await` support in your Node.js runtime, so ideally `node>=7.4`.

```
$ npm install --save @f5io/csp
```

or

```
$ yarn add @f5io/csp
```

## Example Usage

Below is a trivial example of usage, that plays on the standard ping-pong example.

```javascript
const { channel, put, take } = require('@f5io/csp');

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

const wiff = channel();
const waff = channel();

const createBall = () => ({ hits: 0, status: '' });

const createBat = async (inbound, outbound) => {
  for await (const ball of inbound) {
    ball.hits++;
    ball.status = ball.status === 'wiff!' ? 'waff!' : 'wiff!';
    console.log(`🎾  Ball hit ${ball.hits} time(s), ${ball.status}`);
    await timeout(500); // assume it's going to take a bit to hit the ball
    await put(outbound, ball); // smash the ball back
  }
};

createBat(waff, wiff); // create a bat that will wiff waffs
createBat(wiff, waff); // create a bat that will waff wiffs

put(waff, createBall());
```

![ping pong](/assets/pingpong.gif?raw=true)

## API

This library exposes 5 functions and one factory.

### `channel()`

This factory method constructs a new `channel` and returns it. A channel contains no publicly accessible properties, but contains information about interactions with the `channel`.

```javascript
const chan = channel();
```

### `put(channel, message)` -> `Promise`

The `put` function requires the `channel` on which to put the supplied `message`. The `put` method returns a `Promise` which can be optionally awaited and will resolve when something is ready to take the `message` from the `channel`.

```javascript
const chan = channel();
put(chan, 42);

// ...or...

await put(chan, 42);
```

### `take(channel)` -> `Promise`

The `take` function requires the `channel` to take from. The `take` method returns a `Promise` which should always be awaited and will resolve with a message, when a message is available.

```javascript
const chan = channel();

put(chan, 42);

const msg = await take(chan); // will receive 42
```

### `alts(...channels)` -> `Promise`

The `alts` function will race taking values from multiple `channels`.

```javascript
const chan1 = channel();
const chan2 = channel();

put(chan2, 42);
const msg = await alts(chan1, chan2); // will receive 42
```

### `select(Map<*, channel>|Set<channel>|Array<channel>|Object<string, channel>)` -> `Promise`

The `select` function will race taking values from multiple `channels`, similar to `alts`, but will also return the key of the channel that was selected.

```javascript
const chan1 = channel();
const chan2 = channel();

put(chan2, 42);
const channels = [chan1, chan2];
const result = await select(channels); // will receive [1, 42]
```

Works with `Map` and `Set` as well as with plain-old javascript arrays and objects.

A more complex TypeScript example might look like the following:

```typescript
type Error = { message: string; };
type Result = { success: boolean; };

const errors = channel<Error>();
const results = channel<Result>();
const channels = new Set([ errors, results ]);

for await (const [ chan, msg ] of select<Error | Result>(channels)) {
  switch (chan) {
    case errors: {
      const { message }: Error = msg;
      console.log(message);
      break;
    }
    case results: {
      const { success }: Result = msg;
      console.log(success);
      break;
    }
  }
}
```

### `drain(channel)` -> `Promise`

The `drain` function requires a `channel` which it will drain all messages from until empty, returning an array of messages.

```javascript
const chan = channel();
put(chan, 42);
put(chan, 41);
put(chan, 40);
put(chan, 39);

const msgs = await drain(chan); // will receive [ 42, 41, 40, 39 ]
```

## Contributions

Contributions are welcomed and appreciated!

1. Fork this repository.
1. Make your changes, documenting your new code with comments.
1. Submit a pull request with a sane commit message.

Feel free to get in touch if you have any questions.

## License

Please see the `LICENSE` file for more information.
