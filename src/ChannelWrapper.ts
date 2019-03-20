import { Channel, ChannelImp } from './Channel';
import { alts, select } from './ChannelsUtilities';
import { SelectableImp } from './Selectable';

interface ChannelWrapper<T> {
    getInnerChannel(): Channel<T>;
    put(msg: T): Promise<void>;
    take(): Promise<T>;
    drain(): Promise<T[]>;
    [Symbol.asyncIterator]: (() => AsyncIterableIterator<T>);
}

// exported class
class ChannelWrapperImp<T> implements ChannelWrapper<T>{
    private __ch__: Channel<T>;

    getInnerChannel(): Channel<T> {
        return this.__ch__;
    }

    constructor(ch: ChannelImp<T> = new ChannelImp<T>()) {
        this.__ch__ = ch;
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

    async *[Symbol.asyncIterator]() {
        yield* this.__ch__;
    }

    static alts<S>(...chs: ChannelWrapper<S>[]): Promise<S> {
        const channels = chs.map(ch => ch.getInnerChannel());
        return alts<S>(...channels);
    }

    static async select<S>(sel: { [k: string]: ChannelWrapper<S> } | Map<any, ChannelWrapper<S>> | Set<ChannelWrapper<S>> | ChannelWrapper<S>[]): Promise<[any, S]> {
        // convert ChannelWrapper<S> into Channel<S>
        // because Selectable works only with the latterone
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

        let selectRes = await select<S>(new SelectableImp<S>(res));
        if (sel instanceof Set) {
            // selectRes = [keyOfWinnerChannel, msg]
            // the key of the winner channel contained in a Set have to be the channel itself but
            // selectRes[0] contains an instance of Channel. We need the initial instance of ChannelWrapper
            // that wraps the winner instance of Channel
            selectRes[0] = [...sel.values()].find((value) => value.getInnerChannel() === selectRes[0])
        } 
        return selectRes;
    }

    // as soon as a value is available from one of the input channels, put it immediately into the output channel
    static merge<S>(...chs: ChannelWrapper<S>[]): ChannelWrapper<S> {
        
        const outCh = new ChannelWrapperImp<S>();

        const mergeProcessFactory = async (source: ChannelWrapper<S>) => {
            for await( const msg of source) {
                outCh.put(msg);
            }
        }

        for(const ch of chs) {
            mergeProcessFactory(ch);
        }

        return outCh;
    }

    // before request the next value from one of the input channels, each process will wait the take operation
    // that will be (eventually) performed on the just inserted message
    static mergeDelayed<S>(...chs: ChannelWrapper<S>[]): ChannelWrapper<S> {

        const outCh = new ChannelWrapperImp<S>();

        const mergeProcessFactory = async (source: ChannelWrapper<S>) => {
            for await (const msg of source) {
                await outCh.put(msg);
            }
        }

        for (const ch of chs) {
            mergeProcessFactory(ch);
        }

        return outCh;
    }
}

export {
    ChannelWrapperImp,
    ChannelWrapper
};