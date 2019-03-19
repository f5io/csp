// const messages = Symbol('messages');
// const putters = Symbol('putters');
// const takers = Symbol('takers');
// const racers = Symbol('racers');

// export type Channel<T> = {
//   [messages]: T[];
//   [putters]: (() => void)[];
//   [takers]: ((msg: T) => void)[];
//   [racers]: ((ch: Channel<T>) => void)[];
//   [Symbol.asyncIterator]: (() => AsyncIterableIterator<T>);
// };

// export type Selectable<T> =
//   | { [k: string]: Channel<T> }
//   | Map<any, Channel<T>>
//   | Set<Channel<T>>
//   | Channel<T>[]

// export type SelectableP<T> =
//   | { [k: string]: Promise<Channel<T>> }
//   | Map<any, Promise<Channel<T>>>
//   | Set<Promise<Channel<T>>>
//   | Promise<Channel<T>>[];

// /* public methods */

// function channel<T>(): Channel<T> {
//   return {
//     [messages]: [],
//     [putters]: [],
//     [takers]: [],
//     [racers]: [],
//     async *[Symbol.asyncIterator]() {
//       while (true) {
//         yield await take(this);
//       }
//     },
//   };
// }


// function put<T>(ch: Channel<T>, msg: T): Promise<void> {
//   return new Promise(resolve => {
//     prependMessage(ch, msg);
//     waitATakerOrARacer(ch, resolve);

//     // if both a taker and a racer were waiting a message
//     // the priority is given to the taker that will retrieve 
//     // the message
//     if (isThereAlreadyAPendingTaker(ch)) {
//       unwaitOldestPutter(ch);
//       const msg = retrieveOldestMessage(ch);
//       const taker = retrieveOldestTaker(ch);
//       forwardMessage(taker, msg);
//     } else if (isThereAPendingRacer(ch)) {
//       const racer = retrieveOldestRacer(ch);
//       fulfillTheRacer(racer, ch);
//     }
//   });
// }

// function take<T>(ch: Channel<T>): Promise<T> {
//   return new Promise(resolve => {
//     waitAPutter(ch, resolve);

//     if (isThereAlreadyAPendingPutter(ch)) {
//       unwaitOldestPutter(ch);
//       const msg = retrieveOldestMessage(ch);
//       const taker = retrieveOldestTaker(ch);
//       forwardMessage(taker, msg);
//     }
//   });
// }

// async function alts<T>(...chs: Channel<T>[]): Promise<T> {
//   // transform each channel in a Promise that will fulfill when
//   // the corrisponding channel receive a message
//   const racingChannels = chs.map(ch => race(ch));

//   const winningChannel = await Promise.race(racingChannels);

//   const losersChannels = chs.filter(c => c !== winningChannel);
//   removeLosersRacersFromTheirChannels(losersChannels);

//   unwaitOldestPutter(winningChannel);
//   const msg = retrieveOldestMessage(winningChannel)
//   return msg;

// }

// async function select<T>(sel: Selectable<T>): Promise<[any, T]> {
//   // transform each channel in a Promise that will fulfill when
//   // the corrisponding channel receive a message
//   const racingSelectables = mapToPromise(sel, async ch => {
//     // waitingRacer is a promise that will resolve into the ch passed to race
//     const waitingRacer = race(ch);
//     return waitingRacer;
//   });

//   const racingChannels = revertToArray(racingSelectables);

//   const winningChannel = await Promise.race(racingChannels);
//   const winningChannelKey = keyOf(sel, winningChannel);


//   const losersChannels = revertToArray(filter(sel, ch => ch !== winningChannel));
//   removeLosersRacersFromTheirChannels(losersChannels);

//   unwaitOldestPutter(winningChannel);
//   const msg = retrieveOldestMessage(winningChannel)
//   return [winningChannelKey, msg];

// }

// function drain<T>(ch: Channel<T>): Promise<T[]> {
//   const msgs = [];
//   while (areThereMessages(ch)) {
//     msgs.push(take(ch));
//   }
//   return Promise.all(msgs);
// }

// export { channel, put, take, alts, select, drain };

// /* private methods */
// function race<T>(ch: Channel<T>): Promise<Channel<T>> {
//   return new Promise(resolve => {
//     waitTheChannel(ch, resolve);

//     if (isThereAlreadyAPendingPutter(ch)) {
//       const racer = retrieveOldestRacer(ch);
//       fulfillTheRacer(racer, ch);
//     }
//   });
// }

// /*function map<T>(sel: Selectable<T>, fn: (c: Channel<T>) => Channel<T>): Selectable<T> {
//   let res;
//   if (sel instanceof Map) {
//     const selEntries = [...sel.entries()];
//     res = new Map(selEntries.map(([key, ch]): [any, Channel<T>] => [key, fn(ch)]));
//   } else if (sel instanceof Set) {
//     res = new Set([...sel.values()].map(ch => fn(ch)));
//   } else if (Array.isArray(sel)) {
//     res = sel.map(ch => fn(ch));
//   } else {
//     // plain js object

//     // to erase as soon as typescript supports es2019 features: use Object.fromEntries instead
//     const fromEntries = function fromEntries(iterable: any) {
//       return [...iterable]
//         .reduce((obj, { 0: key, 1: val }) => Object.assign(obj, { [key]: val }), {})
//     }
//     res = fromEntries(Object.entries(sel).map(([key, ch]) => [key, fn(ch)]));
//   }
//   return res;
// }*/

// function mapToPromise<T>(sel: Selectable<T>, fn: (c: Channel<T>) => Promise<Channel<T>>): SelectableP<T> {
//   let res;
//   if (sel instanceof Map) {
//     const selEntries = [...sel.entries()];
//     res = new Map(selEntries.map(([key, ch]): [any, Promise<Channel<T>>] => [key, fn(ch)]));
//   } else if (sel instanceof Set) {
//     res = new Set([...sel.values()].map((ch): Promise<Channel<T>> => fn(ch)));
//   } else if (Array.isArray(sel)) {
//     res = sel.map((ch): Promise<Channel<T>> => fn(ch));
//   } else {
//     // plain js object

//     // to erase as soon as typescript supports es2019 features: use Object.fromEntries instead
//     const fromEntries = function fromEntries(iterable: any) {
//       return [...iterable]
//         .reduce((obj, { 0: key, 1: val }) => Object.assign(obj, { [key]: val }), {})
//     }
//     res = fromEntries(Object.entries(sel).map(([key, ch]): [string, Promise<Channel<T>>] => [key, fn(ch)]));
//   }
//   return res;
// }

// function filter<T>(sel: Selectable<T>, predicate: (c: Channel<T>) => boolean): Selectable<T> {
//   let res;
//   if (sel instanceof Set) {
//     const values = [...sel.values()];
//     const filteredValues = values.filter(predicate);
//     res = new Set(filteredValues);
//   } else if (sel instanceof Map) {
//     const entries = [...sel.entries()];
//     const filteredEntries = entries.filter(([, value]) => predicate(value));
//     res = new Map(filteredEntries);
//   } else if (Array.isArray(sel)) {
//     const values = [...sel.values()];
//     const filteredValues = values.filter(predicate);
//     res = filteredValues;
//   } else {
//     // plain js object

//     // use it as soon as typescript supports es2019 features
//     // res = Object.fromEntries(Object.entries(sel).filter(([, value]) => predicate(value)));

//     // to erase as soon as typescript supports es2019 features
//     const fromEntries = function fromEntries(iterable: any) {
//       return [...iterable]
//         .reduce((obj, { 0: key, 1: val }) => Object.assign(obj, { [key]: val }), {})
//     }

//     res = fromEntries(Object.entries(sel).filter(([, value]) => predicate(value)));
//   }
//   return res;
// }

// function keyOf<T>(sel: Selectable<T>, searchedCh: Channel<T>): any {
//   let res;
//   if (sel instanceof Map) {
//     const selEntries = [...sel.entries()];
//     const [key] = selEntries.find(([, ch]) => ch === searchedCh);
//     res = key;
//   } else if (sel instanceof Set) {
//     res = searchedCh;
//   } else if (Array.isArray(sel)) {
//     res = sel.findIndex(ch => ch === searchedCh);
//   } else {
//     // plain js object
//     const selEntries = Object.entries(sel);
//     const [key] = selEntries.find(([, ch]) => ch === searchedCh);
//     res = key;
//   }
//   return res;
// }


// function revertToArray<T>(sel: Selectable<T> | SelectableP<T>): Channel<T>[] {
//   let res;
//   if ((sel instanceof Set) || (sel instanceof Map) || (Array.isArray(sel))) {
//     res = [...sel.values()];
//   } else {
//     // plain js object
//     res = Object.values(sel);
//   }
//   return res;
// }

// /* atomic private methods */
// function prependMessage<T>(ch: Channel<T>, msg: T): void {
//   ch[messages].unshift(msg);
// }
// function waitATakerOrARacer<T>(ch: Channel<T>, resolve: () => void): void {
//   ch[putters].unshift(resolve);
// }
// function isThereAlreadyAPendingTaker<T>(ch: Channel<T>): boolean {
//   return !!ch[takers].length;
// }
// function unwaitOldestPutter<T>(ch: Channel<T>): void {
//   const resolve = ch[putters].pop()
//   resolve();
// }
// function retrieveOldestMessage<T>(ch: Channel<T>): T {
//   return ch[messages].pop();
// }
// function retrieveOldestTaker<T>(ch: Channel<T>): ((msg: T) => void) {
//   return ch[takers].pop();
// }
// function forwardMessage<T>(taker: (msg: T) => void, msg: T): void {
//   taker(msg);
// }
// function waitAPutter<T>(ch: Channel<T>, resolve: (msg: T) => void): void {
//   ch[takers].unshift(resolve);
// }
// function isThereAlreadyAPendingPutter<T>(ch: Channel<T>): boolean {
//   return !!ch[putters].length;
// }
// function waitTheChannel<T>(ch: Channel<T>, resolve: (ch: Channel<T>) => void): void {
//   ch[racers].unshift(resolve);
// }
// function retrieveOldestRacer<T>(ch: Channel<T>): ((ch: Channel<T>) => void) {
//   return ch[racers].pop();
// }
// function fulfillTheRacer<T>(racer: (ch: Channel<T>) => void, ch: Channel<T>): void {
//   racer(ch);
// }
// function isThereAPendingRacer<T>(ch: Channel<T>): boolean {
//   return !!ch[racers].length;
// }
// function removeLosersRacersFromTheirChannels<T>(chs: Channel<T>[]): void {
//   chs.forEach(c => c[racers].pop());
// }
// function areThereMessages<T>(ch: Channel<T>): boolean {
//   return !!ch[messages].length;
// }

export { ChannelWrapperImp as Channel } from './ChannelWrapper';