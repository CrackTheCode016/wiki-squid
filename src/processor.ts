import { lookupArchive } from "@subsquid/archive-registry"
import * as ss58 from "@subsquid/ss58"
import { BatchContext, BatchProcessorItem, SubstrateBatchProcessor } from "@subsquid/substrate-processor"
import { Store, TypeormDatabase } from "@subsquid/typeorm-store"
import { In } from "typeorm"
import { Account, Auction, Transfer } from "./model"
import { AuctionsAuctionStartedEvent, BalancesTransferEvent } from "./types/events"
import { AuctionsAuctionInfoStorage } from "./types/storage"


const processor = new SubstrateBatchProcessor()
    .setDataSource({
        // Lookup archive by the network name in the Subsquid registry
        //archive: lookupArchive("kusama", {release: "FireSquid"})

        // Use archive created by archive/docker-compose.yml
        archive: lookupArchive('kusama', { release: 'FireSquid' })
    })
    .addEvent('Balances.Transfer', {
        data: {
            event: {
                args: true,
                extrinsic: {
                    hash: true,
                    fee: true
                }
            }
        }
    } as const)
    .addEvent('Auctions.AuctionStarted', { data: { event: true } })
    .setBlockRange({ from: 7914237 })



type Item = BatchProcessorItem<typeof processor>
type Ctx = BatchContext<Store, Item>


processor.run(new TypeormDatabase(), async ctx => {
    let transfersData = getTransfers(ctx)
    let auctions = await getAuctions(ctx)

    let accountIds = new Set<string>()
    for (let t of transfersData) {
        accountIds.add(t.from)
        accountIds.add(t.to)
    }

    let accounts = await ctx.store.findBy(Account, { id: In([...accountIds]) }).then(accounts => {
        return new Map(accounts.map(a => [a.id, a]))
    })

    let transfers: Transfer[] = []

    for (let t of transfersData) {
        let { id, blockNumber, timestamp, extrinsicHash, amount, fee } = t

        let from = getAccount(accounts, t.from)
        let to = getAccount(accounts, t.to)

        transfers.push(new Transfer({
            id,
            blockNumber,
            timestamp,
            extrinsicHash,
            from,
            to,
            amount,
            fee
        }))
    }
    await ctx.store.save(Array.from(accounts.values()))
    await ctx.store.insert(transfers)
    await ctx.store.insert(auctions)
})


interface TransferEvent {
    id: string
    blockNumber: number
    timestamp: Date
    extrinsicHash?: string
    from: string
    to: string
    amount: bigint
    fee?: bigint
}

function daysToBlocks(days: number): number {
    const blocks = (days / 6) * 86400;
    return blocks;
}

async function getAuctions(ctx: Ctx): Promise<Auction[]> {
    let auctions: Auction[] = []
    for (let block of ctx.blocks) {
        // consts.slots.leasePeriod
        const PolkadotSlotLeasePeriod = 1209600;
        const KusamaSlotLeasePeriod = 604800;

        // consts.slots.leaseOffsets
        const PolkadotSlotLeaseOffset = 921600;
        const KusamaSlotLeaseOffset = 0;

        // consts.auctions.leasePeriodsPerSlot
        const PolkadotLeasePeriodPerSlot = 8;
        const KusamaLeasePeriodPerSlot = 8;

        // Auction starting phases (45 hours)
        const PolkadotStartingPhase = 27000;
        const KusamaStartingPhase = 27000;

        // const.auctions.endingPeriod (5 days)
        const PolkadotEndingPeriod = 72000;
        const KusamaEndingPeriod = 72000;

        // events
        for (let item of block.items) {
            // Ideally, it would be better to create a handler to handle these events
            if (item.name == "Auctions.AuctionStarted") {
                let event = new AuctionsAuctionStartedEvent(ctx, item.event);
                if (event.isV9010) {
                    const auctionIndex = event.asV9010[0];
                    const auctionLeasePeriod = event.asV9010[1];
                    const auctionEndBlock = event.asV9010[2];
                    const biddingStarts = block.header.height + KusamaStartingPhase;

                    // ONBOARDING INFO
                    const onboardStartBlock = auctionLeasePeriod * KusamaSlotLeasePeriod + KusamaSlotLeaseOffset;
                    const onboardEndBlock = onboardStartBlock + daysToBlocks(KusamaLeasePeriodPerSlot * 6 * 7);
                    const biddingEndsBlock = biddingStarts + KusamaEndingPeriod;

                    const auction = new Auction({
                        id: auctionIndex.toString(),
                        startBlock: block.header.height,
                        onboardEndBlock,
                        onboardStartBlock,
                        biddingEndsBlock,
                        endPeriodBlock: biddingStarts
                    });

                    console.log("FOUND AUCTION! ", auction);
                    auctions.push(auction);

                    // TODO: Get hashes?
                }
            }
        }
    }
    return auctions;
}

function getTransfers(ctx: Ctx): TransferEvent[] {
    let transfers: TransferEvent[] = []
    for (let block of ctx.blocks) {
        for (let item of block.items) {
            if (item.name == "Balances.Transfer") {
                let e = new BalancesTransferEvent(ctx, item.event)
                let rec: { from: Uint8Array, to: Uint8Array, amount: bigint }
                if (e.isV1020) {
                    let [from, to, amount] = e.asV1020
                    rec = { from, to, amount }
                } else if (e.isV1050) {
                    let [from, to, amount] = e.asV1050
                    rec = { from, to, amount }
                } else if (e.isV9130) {
                    rec = e.asV9130
                } else {
                    throw new Error('Unsupported spec')
                }

                transfers.push({
                    id: item.event.id,
                    blockNumber: block.header.height,
                    timestamp: new Date(block.header.timestamp),
                    extrinsicHash: item.event.extrinsic?.hash,
                    from: ss58.codec('kusama').encode(rec.from),
                    to: ss58.codec('kusama').encode(rec.to),
                    amount: rec.amount,
                    fee: item.event.extrinsic?.fee || 0n
                })
            }
        }
    }
    return transfers
}


function getAccount(m: Map<string, Account>, id: string): Account {
    let acc = m.get(id)
    if (acc == null) {
        acc = new Account()
        acc.id = id
        m.set(id, acc)
    }
    return acc
}
