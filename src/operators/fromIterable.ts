import { ChannelWrapper, ChannelWrapperImp } from '../ChannelWrapper';

// take all the values from the sync iterable and put them immediately into the input (this) channel
function fromIterable<T>(this: ChannelWrapper<T>, it: Iterable<T>): ChannelWrapper<T> {
    
    for(const msg of it) {
        this.put(msg);
    }

    return this;
}

ChannelWrapperImp.prototype.fromIterable = fromIterable;

declare module '../ChannelWrapper' {
    interface ChannelWrapperImp<T> {
        fromIterable: typeof fromIterable;
    }
}