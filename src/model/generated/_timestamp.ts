import assert from "assert"
import * as marshal from "./marshal"

export class Timestamp {
    private _start!: bigint
    private _end!: bigint

    constructor(props?: Partial<Omit<Timestamp, 'toJSON'>>, json?: any) {
        Object.assign(this, props)
        if (json != null) {
            this._start = marshal.bigint.fromJSON(json.start)
            this._end = marshal.bigint.fromJSON(json.end)
        }
    }

    get start(): bigint {
        assert(this._start != null, 'uninitialized access')
        return this._start
    }

    set start(value: bigint) {
        this._start = value
    }

    get end(): bigint {
        assert(this._end != null, 'uninitialized access')
        return this._end
    }

    set end(value: bigint) {
        this._end = value
    }

    toJSON(): object {
        return {
            start: marshal.bigint.toJSON(this.start),
            end: marshal.bigint.toJSON(this.end),
        }
    }
}
