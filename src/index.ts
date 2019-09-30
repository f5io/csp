const messages = Symbol('messages');
const putters = Symbol('putters');
const takers = Symbol('takers');
const racers = Symbol('racers');

export type Channel<T> = {
  [messages]: T[];
  [putters]: (() => void)[];
  [takers]: ((msg: T) => void)[];
  [racers]: ((ch: Channel<T>) => void)[];
  [Symbol.asyncIterator]: (() => AsyncIterableIterator<T>);
}

export type Selectable<T> =
  | { [k: string]: Channel<T> }
  | Map<any, Channel<T>>
  | Set<Channel<T>>
  | Channel<T>[];

export type IterablePromise<T> =
  & Promise<T>
  & { [Symbol.asyncIterator]: (() => AsyncIterableIterator<T>) };

/* private methods */

function race<T>(ch: Channel<T>): Promise<Channel<T>> {
  return new Promise(resolve => {
    ch[racers].unshift(resolve);
    if (ch[putters].length)
      ch[racers].pop()(ch);
  });
}

function map<T>(sel: Selectable<T>, fn: (c: Channel<T>, k: any) => Promise<[any, Channel<T>]>): Promise<[any, Channel<T>]>[] {
  if (sel instanceof Set) {
    return [ ...sel.values() ].map(ch => fn(ch, ch));
  } else if (sel instanceof Map) {
    return [ ...sel.entries() ].map(([ k, v ]) => fn(v, k));
  } else if (Array.isArray(sel)) {
    return sel.map(fn);
  }
  return Object.entries(sel).map(([ k, v ]) => fn(v, k));
}

function forEach<T>(sel: Selectable<T>, fn: (c: Channel<T>) => void): void {
  if (sel instanceof Set) {
    return sel.forEach(fn);
  } else if (sel instanceof Map) {
    return sel.forEach(fn);
  } else if (Array.isArray(sel)) {
    return sel.forEach(fn);
  }
  return Object.values(sel).forEach(fn);
}


/* public methods */

function channel<T>(): Channel<T> {
  return {
    [messages]: [],
    [putters]: [],
    [takers]: [],
    [racers]: [],
    async *[Symbol.asyncIterator]() {
      while (true) {
        yield await take(this);
      }
    }
  };
}

function put<T>(ch: Channel<T>, msg: T): Promise<void> {
  return new Promise(resolve => {
    ch[messages].unshift(msg);
    ch[putters].unshift(resolve);
    if (ch[takers].length) {
      ch[putters].pop()();
      ch[takers].pop()(ch[messages].pop());
    }
    if (ch[racers].length)
      ch[racers].pop()(ch);
  });
}

function take<T>(ch: Channel<T>): IterablePromise<T> {
  const promise = new Promise(resolve => {
    ch[takers].unshift(resolve);
    if (ch[putters].length) {
      ch[putters].pop()();
      ch[takers].pop()(ch[messages].pop());
    }
  });

  return Object.assign(promise, {
    async *[Symbol.asyncIterator]() {
      yield await promise;
      while (true) {
        yield await take(ch);
      }
    }
  }) as IterablePromise<T>;
}

function alts<T>(...chs: Channel<T>[]): IterablePromise<T> {
  const promise = Promise
    .race(chs.map(ch => race(ch)))
    .then(ch => {
      chs.forEach(c => c !== ch && c[racers].pop());
      ch[putters].pop()();
      return ch[messages].pop();
    });

  return Object.assign(promise, {
    async *[Symbol.asyncIterator]() {
      yield await promise;
      while (true) {
        yield await alts(...chs);
      }
    }
  }) as IterablePromise<T>;
}

function select<T>(chs: Selectable<T>): IterablePromise<[any, T]> {
  const promise = Promise
    .race(map(chs, (ch, key) =>
      race(ch).then(result => [ key, result ]) as Promise<[any, Channel<T>]>))
    .then(([ key, ch ]) => {
      forEach(chs, c => c !== ch && c[racers].pop());
      ch[putters].pop()();
      return [ key, ch[messages].pop() ];
    });

  return Object.assign(promise, {
    async *[Symbol.asyncIterator]() {
      yield await promise;
      while (true) {
        yield await select(chs);
      }
    }
  }) as IterablePromise<[any, T]>;
}

function drain<T>(ch: Channel<T>): Promise<T[]> {
  const msgs = [];
  while (ch[messages].length)
    msgs.push(take(ch));
  return Promise.all(msgs);
}

export { channel, put, take, alts, select, drain };

