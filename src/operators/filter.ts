import { ChannelWrapper, ChannelWrapperImp } from '../ChannelWrapper';

function filter<T>(this: ChannelWrapper<T>, predicateFn: (msg: T) => boolean): ChannelWrapper<T> {
    const outCh = new ChannelWrapperImp<T>();

    // start the async process that will filter messages coming from the input channel (this)
    // sending them to the output channel if the check contained into the predicateFn is passed
    (async () => {
        for await (const msg of this) {
            const wasCheckPassed = predicateFn(msg);
            
            // wait for something ready to take the message before asking the next one
            // to the input channel (this) only if the check was passed
            await wasCheckPassed ? outCh.put(msg) : null;
        }
    })();

    return outCh;
}

ChannelWrapperImp.prototype.filter = filter;

declare module '../ChannelWrapper' {
    interface ChannelWrapperImp<T> {
        filter: typeof filter;
    }
}