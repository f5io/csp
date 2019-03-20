import { ChannelWrapper, ChannelWrapperImp } from '../ChannelWrapper';

// take all the values from the sync iterable and put them into the input (this) channel
// waiting that a value is taken from the channel before put the next one
// useful for infinite iterables
function fromIterableDelayed<T>(this: ChannelWrapper<T>, it: Iterable<T>): ChannelWrapper<T> {
    
    (async () => {
        for (const msg of it) {
            await this.put(msg);
        }
    })()

    return this;
}

ChannelWrapperImp.prototype.fromIterableDelayed = fromIterableDelayed;

declare module '../ChannelWrapper' {
    interface ChannelWrapperImp<T> {
        fromIterableDelayed: typeof fromIterableDelayed;
    }
}