import { ChannelWrapper, ChannelWrapperImp } from '../ChannelWrapper';

// as soon as a value is inserted into the source, it will be emitted into listening channels
function broadcast<T>(this: ChannelWrapper<T>, ...chs: ChannelWrapper<T>[]): ChannelWrapper<T> {
    
    // start the async process that will broadcast messages coming from the input channel (this)
    // sending them to the listening channels
    (async () => {
        for await (const msg of this) {
            chs.forEach(ch => ch.put(msg));
        }
    })();

    return this;
}

ChannelWrapperImp.prototype.broadcast = broadcast;

declare module '../ChannelWrapper' {
    interface ChannelWrapperImp<T> {
        broadcast: typeof broadcast;
    }
}