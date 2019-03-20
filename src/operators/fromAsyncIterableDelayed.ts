import { ChannelWrapper, ChannelWrapperImp } from '../ChannelWrapper';

// as soon as a value is available, put it immediately into the input (this) channel
// but wait until something is ready to take it before requesting the next one and putting it into the channel
function fromAsyncIterableDelayed<T>(this: ChannelWrapper<T>, ait: AsyncIterable<T>): ChannelWrapper<T> {
    
    (async () => {
        for await (const msg of ait) {
            await this.put(msg);
        }
    })();

    return this;
}

ChannelWrapperImp.prototype.fromAsyncIterableDelayed = fromAsyncIterableDelayed;

declare module '../ChannelWrapper' {
    interface ChannelWrapperImp<T> {
        fromAsyncIterableDelayed: typeof fromAsyncIterableDelayed;
    }
}