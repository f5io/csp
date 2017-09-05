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
    console.log(`🎾  Ball hit ${ball.hit} time(s), ${ball.status}`);
    await timeout(500); // assume its going to take a bit to hit the ball
    await put(outbound, ball); // smash the ball back
  }
};

createBat(waff, wiff); // create a bat that will wiff waffs
createBat(wiff, waff); // create a bat that will waff wiffs

put(waff, createBall());
```

<img src="/assets/pingpong.gif?raw=true" style="border-radius: 5px; border: 1px solid rgba(0,0,0,0.3); overflow: hidden; box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);"/>

### Methods
