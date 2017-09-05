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
