import assert from "assert"
import * as marshal from "./marshal"

export class BlockInfo {
    private _id!: string
    private _hash!: string
    private _height!: number
    private _timestamp!: bigint

    constructor(props?: Partial<Omit<BlockInfo, 'toJSON'>>, json?: any) {
        Object.assign(this, props)
        if (json != null) {
            this._id = marshal.id.fromJSON(json.id)
            this._hash = marshal.string.fromJSON(json.hash)
            this._height = marshal.int.fromJSON(json.height)
            this._timestamp = marshal.bigint.fromJSON(json.timestamp)
        }
    }

    get id(): string {
        assert(this._id != null, 'uninitialized access')
        return this._id
    }

    set id(value: string) {
        this._id = value
    }

    get hash(): string {
        assert(this._hash != null, 'uninitialized access')
        return this._hash
    }

    set hash(value: string) {
        this._hash = value
    }

    get height(): number {
        assert(this._height != null, 'uninitialized access')
        return this._height
    }

    set height(value: number) {
        this._height = value
    }

    get timestamp(): bigint {
        assert(this._timestamp != null, 'uninitialized access')
        return this._timestamp
    }

    set timestamp(value: bigint) {
        this._timestamp = value
    }

    toJSON(): object {
        return {
            id: this.id,
            hash: this.hash,
            height: this.height,
            timestamp: marshal.bigint.toJSON(this.timestamp),
        }
    }
}
