import { ChannelWrapper, ChannelWrapperImp } from '../ChannelWrapper';

// as soon as a value is available, put it immediately into the output (this) channel
function fromAsyncIterable<T>(this: ChannelWrapper<T>, ait: AsyncIterable<T>): ChannelWrapper<T> {
    
    (async () => {
        for await (const msg of ait) {
            this.put(msg);
        }
    })();

    return this;
}

ChannelWrapperImp.prototype.fromAsyncIterable = fromAsyncIterable;

declare module '../ChannelWrapper' {
    interface ChannelWrapperImp<T> {
        fromAsyncIterable: typeof fromAsyncIterable;
    }
}