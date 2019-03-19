import { ChannelWrapper, ChannelWrapperImp } from '../ChannelWrapper';

function map<T>(this: ChannelWrapper<T>, mapperFn: (msg: T) => T): ChannelWrapper<T> {
    const outCh = new ChannelWrapperImp<T>();

    // start the async process that will map messages coming from the input channel (this)
    // sending them to the output channel
    (async () => {
        for await(const msg of this) {
            const outmsg = mapperFn(msg);
            // wait for something ready to take the message before asking the next one
            // to the input channel (this)
            await outCh.put(outmsg);
        }
    })();

    return outCh;
}

ChannelWrapperImp.prototype.map = map;

declare module '../ChannelWrapper' {
    interface ChannelWrapperImp<T> {
        map: typeof map;
    }
}