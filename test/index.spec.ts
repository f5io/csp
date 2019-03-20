import * as test from 'tape';
import { Channel } from '../src';
import '../src/operators/map';
import '../src/operators/filter';
import '../src/operators/delay';
import '../src/operators/fromIterable';
import '../src/operators/fromIterableDelayed';
import '../src/operators/fromAsyncIterable';
import '../src/operators/fromAsyncIterableDelayed';
import '../src/operators/pipe';
import '../src/operators/broadcast';

type Input = string | number;

const msg = (() => {
  let i = 0;
  return () => ++i;
})();

test('[csp] channel', t => {
  const chan = new Channel<number>();
  t.equal(Object.getOwnPropertySymbols(chan.getInnerChannel()).length, 4, 'should contain 4 symbol properties');
  t.equal(Object.getOwnPropertySymbols(Object.getPrototypeOf(chan)).length, 1, 'should contain 1 symbol properties');
  t.end();
});

test('[csp] put', t => {
  const chan = new Channel<string>();
  const res = chan.put('foo');
  t.ok(res instanceof Promise, 'should return an instance of a Promise');
  t.end();
});

test('[csp] take', t => {
  const chan = new Channel();
  const res = chan.take();
  t.ok(res instanceof Promise, 'should return an instance of a Promise');
  t.end();
});

test('[csp] alts', t => {
  const chan1 = new Channel();
  const chan2 = new Channel();
  const res = Channel.alts(chan1, chan2);
  t.ok(res instanceof Promise, 'should return an instance of a Promise');
  t.end();
});

test('[csp] drain', async t => {
  const chan = new Channel<number>();
  const messages = [msg(), msg(), msg(), msg(), msg()];
  messages.forEach(m => chan.put(m));
  const res = chan.drain();
  t.ok(res instanceof Promise, 'should return an instance of a Promise');
  const result = await res;
  t.deepEqual(result, messages, 'should drain the channel');
  t.end();
});

test('[csp] take, already put', async t => {
  const chan = new Channel<number>();
  const m = msg();
  chan.put(m);
  const res = await chan.take();
  t.equal(res, m, 'should resolve the correct value');
  t.end();
});

test('[csp] put, already taking', async t => {
  const chan = new Channel<number>();
  const m = msg();
  const result = chan.take();
  await chan.put(m);
  const res = await result;
  t.equal(res, m, 'should resolve the correct value');
  t.end();
});

test('[csp] take with asynciterable interface', async t => {
  const chan = new Channel<number>();
  const m = msg();
  chan.put(m);
  const res = (await chan[Symbol.asyncIterator]().next()).value;
  t.equal(res, m, 'should resolve the correct value');
  t.end();
});

test('[csp] alts, chan1 ready', async t => {
  const chan1 = new Channel<number>();
  const chan2 = new Channel<string>();
  const m = msg();
  const result = Channel.alts<Input>(chan1, chan2);
  await chan1.put(m);
  const res = await result;
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] alts, chan2 ready', async t => {
  const chan1 = new Channel();
  const chan2 = new Channel();
  const m = msg();
  const putter = chan2.put(m);
  const result = Channel.alts(chan1, chan2);
  await putter;
  const res = await result;
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Array, chan1 ready', async t => {
  const chan1 = new Channel<number>();
  const chan2 = new Channel<string>();
  const m = msg();
  const result = Channel.select<Input>([chan1, chan2]);
  await chan1.put(m);
  const [id, res] = await result;
  t.equal(id, 0, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Array, chan2 ready', async t => {
  const chan1 = new Channel();
  const chan2 = new Channel();
  const m = msg();
  const putter = chan2.put(m);
  const result = Channel.select([chan1, chan2]);
  await putter;
  const [id, res] = await result;
  t.equal(id, 1, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Map, chan1 ready', async t => {
  const chan1 = new Channel<number>();
  const chan2 = new Channel<string>();
  const m = msg();
  const key1 = Symbol();
  const key2 = Symbol();
  const result = Channel.select<Input>(new Map<Symbol, Channel<Input>>([[key1, chan1], [key2, chan2]]));
  await chan1.put(m);
  const [id, res] = await result;
  t.equal(id, key1, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Map, chan2 ready', async t => {
  const chan1 = new Channel();
  const chan2 = new Channel();
  const m = msg();
  const putter = chan2.put(m);
  const key1 = Symbol();
  const key2 = Symbol();
  const result = Channel.select(new Map([[key1, chan1], [key2, chan2]]));
  await putter;
  const [id, res] = await result;
  t.equal(id, key2, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Object, chan1 ready', async t => {
  const chan1 = new Channel<number>();
  const chan2 = new Channel<string>();
  const m = msg();
  const result = Channel.select<Input>({ a: chan1, b: chan2 });
  await chan1.put(m);
  const [id, res] = await result;
  t.equal(id, 'a', 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Object, chan2 ready', async t => {
  const chan1 = new Channel();
  const chan2 = new Channel();
  const m = msg();
  const putter = chan2.put(m);
  const result = Channel.select({ a: chan1, b: chan2 });
  await putter;
  const [id, res] = await result;
  t.equal(id, 'b', 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Set, chan1 ready', async t => {
  const chan1 = new Channel<number>();
  const chan2 = new Channel<string>();
  const m = msg();
  const result = Channel.select<Input>(new Set([chan1, chan2]));
  await chan1.put(m);
  const [id, res] = await result;
  t.equal(id, chan1, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Set, chan2 ready', async t => {
  const chan1 = new Channel();
  const chan2 = new Channel();
  const m = msg();
  const putter = chan2.put(m);
  const result = Channel.select(new Set([chan1, chan2]));
  await putter;
  const [id, res] = await result;
  t.equal(id, chan2, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] operator map', async t => {
  const chan = new Channel<number>();
  const m = msg();
  chan.put(m);
  const res = await chan.map(v => 10 * v).take();
  t.equal(res, m * 10, 'should resolve the correct value');
  t.end();
});

test('[csp] operator filter', async t => {
  const chan = new Channel<number>();
  chan.put(1);
  chan.put(2);
  chan.put(3);
  chan.put(4);
  const resCh = chan.filter(v => Boolean(v % 2));
  const v1 = await resCh.take();
  const v2 = await resCh.take();
  t.equal(v1, 1, 'should resolve the correct value');
  t.equal(v2, 3, 'should resolve the correct value');
  t.end();
});

test('[csp] operator delay', async t => {
  const chan = new Channel<number>();
  chan.put(1);
  const now = process.hrtime()[0];
  await chan.delay(3000).take();
  const later = process.hrtime()[0];
  const timeDifferenceInSeconds = later - now;
  t.equal(timeDifferenceInSeconds >= 3, true, 'should resolve the correct value');
  t.end();
});

test('[csp] operator fromIterable', async t => {
  const chan = new Channel<number>();
  const iterable = [1, 2, 3];
  chan.fromIterable(iterable);
  t.equal(await chan.take(), 1, 'should resolve the correct value');
  t.equal(await chan.take(), 2, 'should resolve the correct value');
  t.equal(await chan.take(), 3, 'should resolve the correct value');
  t.end();
});

test('[csp] operator fromIterableDelayed', async t => {
  const chan = new Channel<number>();
  const iterable = {
    *[Symbol.iterator]() {
      let i = 0;
      while (true) {
        yield i++;
      }
    }
  };
  chan.fromIterableDelayed(iterable);
  t.equal(await chan.take(), 0, 'should resolve the correct value');
  t.equal(await chan.take(), 1, 'should resolve the correct value');
  t.equal(await chan.take(), 2, 'should resolve the correct value');
  t.equal(await chan.take(), 3, 'should resolve the correct value');
  t.end();
});

test('[csp] operator fromAsyncIterable', async t => {
  const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const chan = new Channel<number>();
  const asyncIterable = {
    async *[Symbol.asyncIterator]() {
      yield* [1, 2, 3, 4, 5];
    }
  };
  chan.fromAsyncIterable(asyncIterable);
  t.equal(await chan.take(), 1, 'should resolve the correct value');
  // fromAsyncIterable() does not wait the take operations before inserting new values into
  // the channel, so after a null timeout (needed by how microtasks are resolved) we can drain
  // all the remaining values from the channel
  await timeout(0);
  t.deepEqual(await chan.drain(), [2, 3, 4, 5], 'should resolve the correct value');
  t.end();
});

test('[csp] operator fromAsyncIterableDelayed', async t => {
  const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const chan = new Channel<number>();
  const asyncIterable = {
    async *[Symbol.asyncIterator]() {
      yield* [1, 2, 3, 4, 5];
    }
  };
  chan.fromAsyncIterableDelayed(asyncIterable);
  t.equal(await chan.take(), 1, 'should resolve the correct value');
  // fromAsyncIterableDelayed() does wait the take operations before inserting new values into
  // the channel, so after a null timeout (needed by how microtasks are resolved) we can drain
  // only the next value, 2
  await timeout(0);
  t.deepEqual(await chan.drain(), [2], 'should resolve the correct value');
  t.end();
});

test('[csp] operator pipe', async t => {
  const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const source = new Channel();
  const dest = new Channel();

  // pipe the channels
  const resCh = source.pipe(dest);
  t.equal(resCh, dest, 'should resolve the correct value');

  // put three numbers into the source
  source.fromIterable([1, 2, 3]);

  // before the next value is taken from the source channel, pipe() will await 
  // a take operation (implicitily contained into the drain() method)
  await timeout(0);
  t.deepEqual(await dest.drain(), [1], 'should resolve the correct value');
  await timeout(0);
  t.deepEqual(await dest.drain(), [2], 'should resolve the correct value');
  await timeout(0);
  t.deepEqual(await dest.drain(), [3], 'should resolve the correct value');

  t.end();
});

test('[csp] merge', async t => {
  
  const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const chan1 = new Channel();
  const chan2 = new Channel();

  const result = Channel.merge(chan1, chan2);

  chan1.fromIterable([1, 2, 3]);
  chan2.fromIterable([4, 5, 6]);

  // thanks to the following await, the execution of the current async function can be paused
  // to start the flow of values from chan1 and chan2 to result
  await timeout(0);

  t.deepEqual((await result.drain()).length, 6, 'should resolve the correct value');
  t.end();
});

test('[csp] mergeDelayed', async t => {

  const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const chan1 = new Channel();
  const chan2 = new Channel();

  const result = Channel.mergeDelayed(chan1, chan2);

  chan1.fromIterable([1, 2, 3]);
  chan2.fromIterable([4, 5, 6]);

  // thanks to the following await, the execution of the current async function can be paused
  // to start the flow of values from chan1 and chan2 to result
  // but thanks to mergeDelayed only the first value contained in chan1 and the first value
  // contained in chan2 will flow into result
  await timeout(0);

  t.deepEqual((await result.drain()).length, 2, 'should resolve the correct value');
  t.end();
});

test('[csp] operator broadcast', async t => {

  

  const source = new Channel();
  const dest1 = new Channel();
  const dest2 = new Channel();
  const dest3 = new Channel();

  source.broadcast(dest1, dest2, dest3);

  const m = msg();
  await source.put(m);

  t.equal(await dest1.take(), m, 'should resolve the correct value');
  t.equal(await dest2.take(), m, 'should resolve the correct value');
  t.equal(await dest3.take(), m, 'should resolve the correct value');
  t.end();
});