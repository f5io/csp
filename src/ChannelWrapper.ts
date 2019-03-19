import { Channel, ChannelImp } from './Channel';
import { alts, select } from './ChannelsUtilities';
import { SelectableImp } from './Selectable';

interface ChannelWrapper<T> {
    getInnerChannel(): Channel<T>;
    put(msg: T): Promise<void>;
    take(): Promise<T>;
    drain(): Promise<T[]>;
}

// exported class
class ChannelWrapperImp<T> implements ChannelWrapper<T>{
    private __ch__: Channel<T>;

    getInnerChannel(): Channel<T> {
        return this.__ch__;
    }

    constructor() {
        this.__ch__ = new ChannelImp<T>();
    }

    put(msg: T): Promise<void> {
        return this.__ch__.put(msg);
    }

    take(): Promise<T> {
        return this.__ch__.take();
    }

    drain(): Promise<T[]> {
        return this.__ch__.drain();
    }

    static alts<S>(...chs: ChannelWrapper<S>[]): Promise<S> {
        const channels = chs.map(ch => ch.getInnerChannel());
        return alts<S>(...channels);
    }

    static select<S>(sel: { [k: string]: ChannelWrapper<S> } | Map<any, ChannelWrapper<S>> | Set<ChannelWrapper<S>> | ChannelWrapper<S>[]): Promise<[any, S]> {
        // convert from Selectable of ChannelWrapper<S> to Selectable of Channel<S>
        let res;
        if (sel instanceof Map) {
            const selEntries = [...sel.entries()];
            res = new Map(selEntries.map(([key, ch]): [any, Channel<S>] => [key, ch.getInnerChannel()]));
        } else if (sel instanceof Set) {
            res = new Set([...sel.values()].map((ch): Channel<S> => ch.getInnerChannel()));
        } else if (Array.isArray(sel)) {
            res = sel.map((ch): Channel<S> => ch.getInnerChannel());
        } else {
            // plain js object

            // to erase as soon as typescript supports es2019 features: use Object.fromEntries instead
            const fromEntries = function fromEntries(iterable: any) {
                return [...iterable]
                    .reduce((obj, { 0: key, 1: val }) => Object.assign(obj, { [key]: val }), {})
            }
            res = fromEntries(Object.entries(sel).map(([key, ch]): [string, Channel<S>] => [key, ch.getInnerChannel()]));
        }

        return select<S>(new SelectableImp<S>(res));
    }
}

export {
    ChannelWrapperImp
};