const messages = Symbol('messages');
const putters = Symbol('putters');
const takers = Symbol('takers');
const racers = Symbol('racers');

export type Channel<T> = {
  [messages]: T[];
  [putters]: (() => void)[];
  [takers]: ((msg: T) => void)[];
  [racers]: ((ch: Channel<T>) => void)[];
};

export type Selectable<T> =
  | { [k: string]: Channel<T> }
  | Map<any, Channel<T>>
  | Set<Channel<T>>
  | Channel<T>[];

/* public methods */

function channel<T>(): Channel<T> {
  return {
    [messages]: [],
    [putters]: [],
    [takers]: [],
    [racers]: [],
  };
}

function put<T>(ch: Channel<T>, msg: T): Promise<void> {
  return new Promise(resolve => {
    prependMessage(ch, msg);
    waitATakerOrARacer(ch, resolve);

    // if both a taker and a racer were waiting a message
    // the priority is given to the taker that will retrieve 
    // the message
    if (isThereAlreadyAPendingTaker(ch)) {
      unwaitOldestPutter(ch);
      const msg = retrieveOldestMessage(ch);
      const taker = retrieveOldestTaker(ch);
      forwardMessage(taker, msg);
    } else if (isThereAPendingRacer(ch)) {
      const racer = retrieveOldestRacer(ch);
      fulfillTheRacer(racer, ch);
    }
  });
}

function take<T>(ch: Channel<T>): Promise<T> {
  return new Promise(resolve => {
    waitAPutter(ch, resolve);

    if (isThereAlreadyAPendingPutter(ch)) {
      unwaitOldestPutter(ch);
      const msg = retrieveOldestMessage(ch);
      const taker = retrieveOldestTaker(ch);
      forwardMessage(taker, msg);
    }
  });
}

async function alts<T>(...chs: Channel<T>[]): Promise<T> {
  // transfrom each channel in a Promise that will fulfill when
  // the corrisponding channel receive a message
  const racingChannels = chs.map(ch => race(ch));

  const winningChannel = await Promise.race(racingChannels);

  const losersChannels = chs.filter(c => c !== winningChannel);
  removeLosersRacersFromTheirChannels(losersChannels);

  unwaitOldestPutter(winningChannel);
  const msg = retrieveOldestMessage(winningChannel)
  return msg;

}

async function select<T>(sel: Selectable<T>): Promise<[any, T]> {
  // transfrom each channel in a Promise that will fulfill when
  // the corrisponding channel receive a message
  const racingChannels = map(sel, async (key, ch) => {
    const waitingRacer = race(ch);
    return [key, await waitingRacer];
  })

  const [key, winningChannel] = await Promise.race(racingChannels);

  const losersChannels = filterAndRevertToArrayOfChannels(sel, c => c !== winningChannel);
  removeLosersRacersFromTheirChannels(losersChannels);


  unwaitOldestPutter(winningChannel);
  const msg = retrieveOldestMessage(winningChannel)
  return [key, msg];

}

function drain<T>(ch: Channel<T>): Promise<T[]> {
  const msgs = [];
  while (areThereMessages(ch)) {
    msgs.push(take(ch));
  }
  return Promise.all(msgs);
}

export { channel, put, take, alts, select, drain };

/* private methods */
function race<T>(ch: Channel<T>): Promise<Channel<T>> {
  return new Promise(resolve => {
    waitTheChannel(ch, resolve);

    if (isThereAlreadyAPendingPutter(ch)) {
      const racer = retrieveOldestRacer(ch);
      fulfillTheRacer(racer, ch);
    }
  });
}

function map<T>(sel: Selectable<T>, fn: (k: any, c: Channel<T>, ) => Promise<[any, Channel<T>]>): Promise<[any, Channel<T>]>[] {
  let res;
  if (sel instanceof Set || sel instanceof Map) {
    res = [...sel.entries()].map(([key, ch]) => fn(key, ch));
  } else if (Array.isArray(sel)) {
    res = sel.map((ch, key) => fn(key, ch));
  } else {
    res = Object.entries(sel).map(([key, ch]) => fn(key, ch));
  }
  return res;
}

function filterAndRevertToArrayOfChannels<T>(sel: Selectable<T>, predicate: (c: Channel<T>) => boolean): Channel<T>[] {
  let res;
  if ((sel instanceof Set) || (sel instanceof Map) || (Array.isArray(sel))) {
    res = [...sel.values()].filter(predicate);
  } else {
    res = Object.values(sel).filter(predicate);
  }
  return res;
}

/* atomic private methods */
function prependMessage<T>(ch: Channel<T>, msg: T): void {
  ch[messages].unshift(msg);
}
function waitATakerOrARacer<T>(ch: Channel<T>, resolve: () => void): void {
  ch[putters].unshift(resolve);
}
function isThereAlreadyAPendingTaker<T>(ch: Channel<T>): boolean {
  return !!ch[takers].length;
}
function unwaitOldestPutter<T>(ch: Channel<T>): void {
  const resolve = ch[putters].pop()
  resolve();
}
function retrieveOldestMessage<T>(ch: Channel<T>): T {
  return ch[messages].pop();
}
function retrieveOldestTaker<T>(ch: Channel<T>): ((msg: T) => void) {
  return ch[takers].pop();
}
function forwardMessage<T>(taker: (msg: T) => void, msg: T): void {
  taker(msg);
}
function waitAPutter<T>(ch: Channel<T>, resolve: (msg: T) => void): void {
  ch[takers].unshift(resolve);
}
function isThereAlreadyAPendingPutter<T>(ch: Channel<T>): boolean {
  return !!ch[putters].length;
}
function waitTheChannel<T>(ch: Channel<T>, resolve: (ch: Channel<T>) => void): void {
  ch[racers].unshift(resolve);
}
function retrieveOldestRacer<T>(ch: Channel<T>): ((ch: Channel<T>) => void) {
  return ch[racers].pop();
}
function fulfillTheRacer<T>(racer: (ch: Channel<T>) => void, ch: Channel<T>): void {
  racer(ch);
}
function isThereAPendingRacer<T>(ch: Channel<T>): boolean {
  return !!ch[racers].length;
}
function removeLosersRacersFromTheirChannels<T>(chs: Channel<T>[]): void {
  chs.forEach(c => c[racers].pop());
}
function areThereMessages<T>(ch: Channel<T>): boolean {
  return !!ch[messages].length;
}





