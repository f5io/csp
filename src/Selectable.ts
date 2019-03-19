import { Channel } from './Channel';

interface Selectable<T> {
    sel: { [k: string]: Channel<T> } | Map<any, Channel<T>> | Set<Channel<T>> | Channel<T>[];
    mapToPromise(fn: (c: Channel<T>) => Promise<Channel<T>>): SelectableP<T>;
    revertToArray(): Channel<T>[];
    map(fn: (c: Channel<T>) => Channel<T>): Selectable<T>;
    filter(predicate: (c: Channel<T>) => boolean): Selectable<T>;
    keyOf(searchedCh: Channel<T>): any;
}

interface SelectableP<T> {
    sel: { [k: string]: Promise<Channel<T>> } | Map<any, Promise<Channel<T>>> | Set<Promise<Channel<T>>> | Promise<Channel<T>>[];
    revertToArray(): Promise<Channel<T>>[];
}

class SelectableImp<T> implements Selectable<T> {

    constructor(public sel: { [k: string]: Channel<T> } | Map<any, Channel<T>> | Set<Channel<T>> | Channel<T>[]) {
    }

    map(fn: (c: Channel<T>) => Channel<T>): Selectable<T> {
        let res;
        if (this.sel instanceof Map) {
            const selEntries = [...this.sel.entries()];
            res = new Map(selEntries.map(([key, ch]): [any, Channel<T>] => [key, fn(ch)]));
        } else if (this.sel instanceof Set) {
            res = new Set([...this.sel.values()].map(ch => fn(ch)));
        } else if (Array.isArray(this.sel)) {
            res = this.sel.map(ch => fn(ch));
        } else {
            // plain js object

            // to erase as soon as typescript supports es2019 features: use Object.fromEntries instead
            const fromEntries = function fromEntries(iterable: any) {
                return [...iterable]
                    .reduce((obj, { 0: key, 1: val }) => Object.assign(obj, { [key]: val }), {})
            }
            res = fromEntries(Object.entries(this.sel).map(([key, ch]) => [key, fn(ch)]));
        }
        return new SelectableImp<T>(res);
    }

    mapToPromise(fn: (c: Channel<T>) => Promise<Channel<T>>): SelectableP<T> {
        let res;
        if (this.sel instanceof Map) {
            const selEntries = [...this.sel.entries()];
            res = new Map(selEntries.map(([key, ch]): [any, Promise<Channel<T>>] => [key, fn(ch)]));
        } else if (this.sel instanceof Set) {
            res = new Set([...this.sel.values()].map((ch): Promise<Channel<T>> => fn(ch)));
        } else if (Array.isArray(this.sel)) {
            res = this.sel.map((ch): Promise<Channel<T>> => fn(ch));
        } else {
            // plain js object

            // to erase as soon as typescript supports es2019 features: use Object.fromEntries instead
            const fromEntries = function fromEntries(iterable: any) {
                return [...iterable]
                    .reduce((obj, { 0: key, 1: val }) => Object.assign(obj, { [key]: val }), {})
            }
            res = fromEntries(Object.entries(this.sel).map(([key, ch]): [string, Promise<Channel<T>>] => [key, fn(ch)]));
        }
        return new SelectablePImp<T>(res);
    }

    filter(predicate: (c: Channel<T>) => boolean): Selectable<T> {
        let res;
        if (this.sel instanceof Set) {
            const values = [...this.sel.values()];
            const filteredValues = values.filter(predicate);
            res = new Set(filteredValues);
        } else if (this.sel instanceof Map) {
            const entries = [...this.sel.entries()];
            const filteredEntries = entries.filter(([, value]) => predicate(value));
            res = new Map(filteredEntries);
        } else if (Array.isArray(this.sel)) {
            const values = [...this.sel.values()];
            const filteredValues = values.filter(predicate);
            res = filteredValues;
        } else {
            // plain js object

            // to erase as soon as typescript supports es2019 features: use Object.fromEntries instead
            const fromEntries = function fromEntries(iterable: any) {
                return [...iterable]
                    .reduce((obj, { 0: key, 1: val }) => Object.assign(obj, { [key]: val }), {})
            }

            res = fromEntries(Object.entries(this.sel).filter(([, value]) => predicate(value)));
        }
        return new SelectableImp<T>(res);
    }

    revertToArray(): Channel<T>[] {
        let res;
        if ((this.sel instanceof Set) || (this.sel instanceof Map) || (Array.isArray(this.sel))) {
            res = [...this.sel.values()];
        } else {
            // plain js object
            res = Object.values(this.sel);
        }
        return (res as Channel<T>[]);
    }

    keyOf(searchedCh: Channel<T>): any {
        let res;
        if (this.sel instanceof Map) {
            const selEntries = [...this.sel.entries()];
            const [key] = selEntries.find(([, ch]) => ch === searchedCh);
            res = key;
        } else if (this.sel instanceof Set) {
            res = searchedCh;
        } else if (Array.isArray(this.sel)) {
            res = this.sel.findIndex(ch => ch === searchedCh);
        } else {
            // plain js object
            const selEntries = Object.entries(this.sel);
            const [key] = selEntries.find(([, ch]) => ch === searchedCh);
            res = key;
        }
        return res;
    }

    
}

class SelectablePImp<T> implements SelectableP<T> {
    constructor(public sel: { [k: string]: Promise<Channel<T>> }
        | Map<any, Promise<Channel<T>>>
        | Set<Promise<Channel<T>>>
        | Promise<Channel<T>>[]) {
    }

    revertToArray(): Promise<Channel<T>>[] {
        let res;
        if ((this.sel instanceof Set) || (this.sel instanceof Map) || (Array.isArray(this.sel))) {
            res = [...this.sel.values()];
        } else {
            // plain js object
            res = Object.values(this.sel);
        }
        return (res as Promise<Channel<T>>[]);
    }
}

export { Selectable, SelectableImp };