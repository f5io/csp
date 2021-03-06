import * as test from 'tape';
import { channel, put, take, alts, select, drain, Channel } from '../src';

type Input = string | number;

const msg = (() => {
  let i = 0;
  return () => ++i;
})();

test('[csp] channel', t => {
  const chan = channel<number>();
  t.equal(Object.getOwnPropertySymbols(chan).length, 5, 'should contain 5 symbol properties');
  t.equal(Object.keys(chan).length, 1, 'should only expose length propery');
  t.end();
});

test('[csp] put', t => {
  const chan = channel<string>();
  const res = put(chan, 'foo');
  t.ok(res instanceof Promise, 'should return an instance of a Promise');
  t.end();
});

test('[csp] take', t => {
  const chan = channel();
  const res = take(chan);
  t.ok(res instanceof Promise, 'should return an instance of a Promise');
  t.end();
});

test('[csp] length', t => {
  const chan = channel<string>();
  t.equals(chan.length, 0, 'should start with length 0');
  put(chan, 'foo');
  put(chan, 'bar');
  t.equals(chan.length, 2, 'should equal the message queue size');
  take(chan);
  t.equals(chan.length, 1, 'should equal the message queue size');
  t.end();
});

test('[csp] length, readonly', t => {
  const chan = channel<string>();
  (chan as any).length = 9;
  t.equals(chan.length, 0, 'should be unchanged');
  t.end();
});

test('[csp] alts', t => {
  const chan1 = channel();
  const chan2 = channel();
  const res = alts(chan1, chan2);
  t.ok(res instanceof Promise, 'should return an instance of a Promise');
  t.end();
});

test('[csp] drain', async t => {
  const chan = channel<number>();
  const messages = [ msg(), msg(), msg(), msg(), msg() ];
  messages.forEach(m => put(chan, m));
  const res = drain(chan);
  t.ok(res instanceof Promise, 'should return an instance of a Promise');
  const result = await res;
  t.deepEqual(result, messages, 'should drain the channel');
  t.end();
});

test('[csp] take, already put', async t => {
  const chan = channel<number>();
  const m = msg();
  put(chan, m);
  const res = await take(chan);
  t.equal(res, m, 'should resolve the correct value');
  t.end();
});

test('[csp] put, already taking', async t => {
  const chan = channel<number>();
  const m = msg();
  const result = take(chan);
  await put(chan, m);
  const res = await result;
  t.equal(res, m, 'should resolve the correct value');
  t.end();
});

test('[csp] alts, chan1 ready', async t => {
  const chan1 = channel<number>();
  const chan2 = channel<string>();
  const m = msg();
  const result = alts<Input>(chan1, chan2);
  await put(chan1, m);
  const res = await result;
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] alts, chan2 ready', async t => {
  const chan1 = channel();
  const chan2 = channel();
  const m = msg();
  const putter = put(chan2, m);
  const result = alts(chan1, chan2);
  await putter;
  const res = await result;
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Array, chan1 ready', async t => {
  const chan1 = channel<number>();
  const chan2 = channel<string>();
  const m = msg();
  const result = select<Input>([ chan1, chan2 ]);
  await put(chan1, m);
  const [ id, res ] = await result;
  t.equal(id, 0, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Array, chan2 ready', async t => {
  const chan1 = channel();
  const chan2 = channel();
  const m = msg();
  const putter = put(chan2, m);
  const result = select([ chan1, chan2 ]);
  await putter;
  const [ id, res ] = await result;
  t.equal(id, 1, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Map, chan1 ready', async t => {
  const chan1 = channel<number>();
  const chan2 = channel<string>();
  const m = msg();
  const key1 = Symbol();
  const key2 = Symbol();
  const result = select<Input>(new Map<symbol, Channel<Input>>([ [ key1, chan1 ], [ key2, chan2 ] ]));
  await put(chan1, m);
  const [ id, res ] = await result;
  t.equal(id, key1, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Map, chan2 ready', async t => {
  const chan1 = channel();
  const chan2 = channel();
  const m = msg();
  const putter = put(chan2, m);
  const key1 = Symbol();
  const key2 = Symbol();
  const result = select(new Map([ [ key1, chan1 ], [ key2, chan2 ] ]));
  await putter;
  const [ id, res ] = await result;
  t.equal(id, key2, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Object, chan1 ready', async t => {
  const chan1 = channel<number>();
  const chan2 = channel<string>();
  const m = msg();
  const result = select<Input>({ a: chan1, b: chan2 });
  await put(chan1, m);
  const [ id, res ] = await result;
  t.equal(id, 'a', 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Object, chan2 ready', async t => {
  const chan1 = channel();
  const chan2 = channel();
  const m = msg();
  const putter = put(chan2, m);
  const result = select({ a: chan1, b: chan2 });
  await putter;
  const [ id, res ] = await result;
  t.equal(id, 'b', 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Set, chan1 ready', async t => {
  const chan1 = channel<number>();
  const chan2 = channel<string>();
  const m = msg();
  const result = select<Input>(new Set([ chan1, chan2 ]));
  await put(chan1, m);
  const [ id, res ] = await result;
  t.equal(id, chan1, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] select Set, chan2 ready', async t => {
  const chan1 = channel();
  const chan2 = channel();
  const m = msg();
  const putter = put(chan2, m);
  const result = select(new Set([ chan1, chan2 ]));
  await putter;
  const [ id, res ] = await result;
  t.equal(id, chan2, 'should receive the correct id');
  t.equal(res, m, 'should receive the correct value');
  t.end();
});

test('[csp] AsyncIterable - channel', async t => {
  const chan = channel<string>();
  put(chan, 'foo');
  for await (const m of chan) {
    t.equals(m, 'foo', 'should return the correct value');
    break;
  }
  t.end();
});

test('[csp] AsyncIterable - take', async t => {
  const chan = channel<string>();
  let i = 0;
  const values = [ 'foo', 'bar', 'baz', 'end' ];
  values.forEach(v => put(chan, v));
  for await (const m of take(chan)) {
    t.equals(m, values[i], 'should return the correct value');
    i++;
    if (m === 'end') break;
  }
  t.end();
});

test('[csp] AsyncIterable - alts', async t => {
  const chan = channel<string>();
  const chan2 = channel<boolean>();
  let i = 0;
  put(chan2, true);
  const values = [ 'foo', 'bar', 'baz' ];
  values.forEach(v => put(chan, v));
  for await (const m of alts<any>(chan, chan2)) {
    if (m === true) break;
    t.equals(m, values[i], 'should return the correct value');
    i++;
  }
  t.end();
});

test('[csp] AsyncIterable - select', async t => {
  const chan = channel<string>();
  const chan2 = channel<boolean>();
  let i = 0;
  put(chan2, true);
  const values = [ 'foo', 'bar', 'baz' ];
  values.forEach(v => put(chan, v));
  const chanSet = new Set([ chan, chan2 ]);
  for await (const [ c, m ] of select<string | boolean>(chanSet)) {
    if (m === true) {
      t.equals(c, chan2, 'should return the correct channel');
      break;
    }
    t.equals(m, values[i], 'should return the correct value');
    t.equals(c, chan, 'should return the correct channel');
    i++;
  }
  t.end();
});
