import assert from 'assert'
import {Chain, ChainContext, EventContext, Event, Result, Option} from './support'

export class AuctionsAuctionClosedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'Auctions.AuctionClosed')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     *  An auction ended. All funds become unreserved. [auction_index]
     */
    get isV9010(): boolean {
        return this._chain.getEventHash('Auctions.AuctionClosed') === '0a0f30b1ade5af5fade6413c605719d59be71340cf4884f65ee9858eb1c38f6c'
    }

    /**
     *  An auction ended. All funds become unreserved. [auction_index]
     */
    get asV9010(): number {
        assert(this.isV9010)
        return this._chain.decodeEvent(this.event)
    }

    /**
     * An auction ended. All funds become unreserved.
     */
    get isV9230(): boolean {
        return this._chain.getEventHash('Auctions.AuctionClosed') === 'b43a4f04c143465b1befbba20a53ad22053012b22824f10dc981cf180e36e10d'
    }

    /**
     * An auction ended. All funds become unreserved.
     */
    get asV9230(): {auctionIndex: number} {
        assert(this.isV9230)
        return this._chain.decodeEvent(this.event)
    }
}

export class AuctionsAuctionStartedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'Auctions.AuctionStarted')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     *  An auction started. Provides its index and the block number where it will begin to
     *  close and the first lease period of the quadruplet that is auctioned.
     *  [auction_index, lease_period, ending]
     */
    get isV9010(): boolean {
        return this._chain.getEventHash('Auctions.AuctionStarted') === 'ee14df8652ec18f0202c95706dac25953673d4834fcfe21e7d7559cb96975c06'
    }

    /**
     *  An auction started. Provides its index and the block number where it will begin to
     *  close and the first lease period of the quadruplet that is auctioned.
     *  [auction_index, lease_period, ending]
     */
    get asV9010(): [number, number, number] {
        assert(this.isV9010)
        return this._chain.decodeEvent(this.event)
    }

    /**
     * An auction started. Provides its index and the block number where it will begin to
     * close and the first lease period of the quadruplet that is auctioned.
     */
    get isV9230(): boolean {
        return this._chain.getEventHash('Auctions.AuctionStarted') === '8b2d1722dc0088981b41be544b21195e4f399c63086aae153946e56fab444698'
    }

    /**
     * An auction started. Provides its index and the block number where it will begin to
     * close and the first lease period of the quadruplet that is auctioned.
     */
    get asV9230(): {auctionIndex: number, leasePeriod: number, ending: number} {
        assert(this.isV9230)
        return this._chain.decodeEvent(this.event)
    }
}

export class BalancesTransferEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'Balances.Transfer')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     *  Transfer succeeded (from, to, value, fees).
     */
    get isV1020(): boolean {
        return this._chain.getEventHash('Balances.Transfer') === '72e6f0d399a72f77551d560f52df25d757e0643d0192b3bc837cbd91b6f36b27'
    }

    /**
     *  Transfer succeeded (from, to, value, fees).
     */
    get asV1020(): [Uint8Array, Uint8Array, bigint, bigint] {
        assert(this.isV1020)
        return this._chain.decodeEvent(this.event)
    }

    /**
     *  Transfer succeeded (from, to, value).
     */
    get isV1050(): boolean {
        return this._chain.getEventHash('Balances.Transfer') === 'dad2bcdca357505fa3c7832085d0db53ce6f902bd9f5b52823ee8791d351872c'
    }

    /**
     *  Transfer succeeded (from, to, value).
     */
    get asV1050(): [Uint8Array, Uint8Array, bigint] {
        assert(this.isV1050)
        return this._chain.decodeEvent(this.event)
    }

    /**
     * Transfer succeeded.
     */
    get isV9130(): boolean {
        return this._chain.getEventHash('Balances.Transfer') === '0ffdf35c495114c2d42a8bf6c241483fd5334ca0198662e14480ad040f1e3a66'
    }

    /**
     * Transfer succeeded.
     */
    get asV9130(): {from: Uint8Array, to: Uint8Array, amount: bigint} {
        assert(this.isV9130)
        return this._chain.decodeEvent(this.event)
    }
}
