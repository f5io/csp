const messages = Symbol('messages');
const putters = Symbol('putters');
const takers = Symbol('takers');
const race = Symbol('race');

const channel = () =>
  ({
    [messages]: [],
    [putters]: [],
    [takers]: [],
    [race]: [],
  });

const put = (ch, msg) =>
  new Promise(resolve => {
    ch[messages].unshift(msg);
    ch[putters].unshift(resolve);
    if (ch[takers].length) {
      ch[putters].pop()();
      ch[takers].pop()(ch[messages].pop());
    }
    if (ch[race].length)
      ch[race].pop()(ch);
  });

const take = (ch, _race) =>
  new Promise(resolve => {
    if (_race === race) {
      ch[race].unshift(resolve);
      if (ch[putters].length)
        ch[race].pop()(ch);
    } else {
      ch[takers].unshift(resolve);
      if (ch[putters].length) {
        ch[putters].pop()();
        ch[takers].pop()(ch[messages].pop());
      }
    } 
  });

const alts = (...chs) =>
  Promise.race(chs.map(ch => take(ch, race)))
    .then(ch => {
      chs.forEach(c => c !== ch && c[race].pop());
      ch[putters].pop()();
      return ch[messages].pop();
    });

const drain = (ch) => {
  const msgs = [];
  while (ch[messages].length)
    msgs.push(take(ch));
  return Promise.all(msgs);
};

exports.channel = channel;
exports.put = put;
exports.take = take;
exports.alts = alts;
exports.drain = drain;

module.exports = {
  channel,
  put,
  take,
  alts,
  drain,
};
