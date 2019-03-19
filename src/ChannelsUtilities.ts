import { Selectable } from './Selectable';
import { Channel, racers } from './Channel';

async function alts<T>(...chs: Channel<T>[]): Promise<T> {
    // transform each channel in a Promise that will fulfill when
    // the corrisponding channel receive a message
    const racingChannels = chs.map(ch => ch.race());

    const winningChannel = await Promise.race(racingChannels);

    const losersChannels = chs.filter(c => c !== winningChannel);
    removeLosersRacersFromTheirChannels(losersChannels);

    winningChannel.unwaitOldestPutter();
    const msg = winningChannel.retrieveOldestMessage()
    return msg;
}

async function select<T>(selectable: Selectable<T>): Promise<[any, T]> {

    // transform each channel in a Promise that will fulfill when
    // the corrisponding channel receive a message
    const racingSelectables = selectable.mapToPromise(async ch => {
        // waitingRacer is a promise that will resolve into the ch passed to race
        const waitingRacer = ch.race();
        return waitingRacer;
    });

    const racingChannels = racingSelectables.revertToArray();

    const winningChannel = await Promise.race(racingChannels);
    const winningChannelKey = selectable.keyOf(winningChannel);


    const losersChannels = selectable.filter(ch => ch !== winningChannel).revertToArray();
    removeLosersRacersFromTheirChannels(losersChannels);

    winningChannel.unwaitOldestPutter();
    const msg = winningChannel.retrieveOldestMessage()
    return [winningChannelKey, msg];
}

function removeLosersRacersFromTheirChannels<T>(chs: Channel<T>[]): void {
    chs.forEach(c => c[racers].pop());
}

export { alts, select };


