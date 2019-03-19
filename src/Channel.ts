const messages = Symbol('messages');
const putters = Symbol('putters');
const takers = Symbol('takers');
const racers = Symbol('racers');

interface Channel<T> {
    [messages]: T[];
    [putters]: (() => void)[];
    [takers]: ((msg: T) => void)[];
    [racers]: ((ch: Channel<T>) => void)[];
    [Symbol.asyncIterator]: (() => AsyncIterableIterator<T>);
    put(msg: T): Promise<void>;
    take(): Promise<T>;
    drain(): Promise<T[]>;
    race(): Promise<Channel<T>>;
    prependMessage(msg: T): void;
    waitATakerOrARacer(resolve: () => void): void;
    isThereAlreadyAPendingTaker(): boolean;
    unwaitOldestPutter(): void;
    retrieveOldestMessage(): T;
    retrieveOldestTaker(): ((msg: T) => void);
    waitAPutter(resolve: (msg: T) => void): void;
    isThereAlreadyAPendingPutter(): boolean;
    waitTheChannel(resolve: (ch: Channel<T>) => void): void;
    retrieveOldestRacer(): ((ch: Channel<T>) => void);
    isThereAPendingRacer(): boolean;
    areThereMessages(): boolean;
    fulfillTheRacer(racer: (ch: Channel<T>) => void): void;
}

class ChannelImp<T> implements Channel<T> {
    [messages]: Array<T>;
    [putters]: Array<(() => void)>;
    [takers]: Array<((msg: T) => void)>;
    [racers]: Array<((ch: Channel<T>) => void)>;

    async *[Symbol.asyncIterator]() {
        while (true) {
            yield await this.take();
        }
    }

    put(msg: T): Promise<void> {
        return new Promise(resolve => {
            this.prependMessage(msg);
            this.waitATakerOrARacer(resolve);

            // if both a taker and a racer were waiting a message
            // the priority is given to the taker that will retrieve 
            // the message
            if (this.isThereAlreadyAPendingTaker()) {
                this.unwaitOldestPutter();
                const msg = this.retrieveOldestMessage();
                const taker = this.retrieveOldestTaker();
                forwardMessage(taker, msg);
            } else if (this.isThereAPendingRacer()) {
                const racer = this.retrieveOldestRacer();
                this.fulfillTheRacer(racer);
            }
        });
    }

    take(): Promise<T> {
        return new Promise(resolve => {
            this.waitAPutter(resolve);

            if (this.isThereAlreadyAPendingPutter()) {
                this.unwaitOldestPutter();
                const msg = this.retrieveOldestMessage();
                const taker = this.retrieveOldestTaker();
                forwardMessage(taker, msg);
            }
        });
    }

    drain(): Promise<T[]> {
        const msgs = [];
        while (this.areThereMessages()) {
            msgs.push(this.take());
        }
        return Promise.all(msgs);
    }

    race(): Promise<Channel<T>> {
        return new Promise(resolve => {
            this.waitTheChannel(resolve);

            if (this.isThereAlreadyAPendingPutter()) {
                const racer = this.retrieveOldestRacer();
                this.fulfillTheRacer(racer);
            }
        });
    }

    prependMessage(msg: T): void {
        this[messages].unshift(msg);
    }

    waitATakerOrARacer(resolve: () => void): void {
        this[putters].unshift(resolve);
    }
    isThereAlreadyAPendingTaker(): boolean {
        return !!this[takers].length;
    }
    unwaitOldestPutter(): void {
        const resolve = this[putters].pop()
        resolve();
    }
    retrieveOldestMessage(): T {
        return this[messages].pop();
    }
    retrieveOldestTaker(): ((msg: T) => void) {
        return this[takers].pop();
    }
    waitAPutter(resolve: (msg: T) => void): void {
        this[takers].unshift(resolve);
    }
    isThereAlreadyAPendingPutter(): boolean {
        return !!this[putters].length;
    }
    waitTheChannel(resolve: (ch: Channel<T>) => void): void {
        this[racers].unshift(resolve);
    }
    retrieveOldestRacer(): ((ch: Channel<T>) => void) {
        return this[racers].pop();
    }
    isThereAPendingRacer(): boolean {
        return !!this[racers].length;
    }
    areThereMessages(): boolean {
        return !!this[messages].length;
    }
    fulfillTheRacer(racer: (ch: Channel<T>) => void): void {
        racer(this);
    }
}

/* atomic private methods */
function forwardMessage<T>(taker: (msg: T) => void, msg: T): void {
    taker(msg);
}

// exports
export { Channel, ChannelImp, racers };