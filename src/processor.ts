import { lookupArchive } from "@subsquid/archive-registry"
import * as ss58 from "@subsquid/ss58"
import { BatchContext, BatchProcessorItem, SubstrateBatchProcessor } from "@subsquid/substrate-processor"
import { Store, TypeormDatabase } from "@subsquid/typeorm-store"
import { In } from "typeorm"
import { Account, Auction, Timestamp, Transfer } from "./model"
import { AuctionsAuctionClosedEvent, AuctionsAuctionStartedEvent, BalancesTransferEvent } from "./types/events"
import { AuctionsAuctionInfoStorage } from "./types/storage"


const processor = new SubstrateBatchProcessor()
    .setDataSource({
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
    .addEvent('Auctions.AuctionClosed', { data: { event: true } })
    .setBlockRange({ from: 7914237 })



type Item = BatchProcessorItem<typeof processor>
type Ctx = BatchContext<Store, Item>


processor.run(new TypeormDatabase(), async ctx => {

    // AUCTIONS
    let availableAuctions = await ctx.store.findBy(Auction, {});
    let auctions = await getAuctions(ctx, availableAuctions);

    await ctx.store.upsert(auctions)
})

function daysToBlocks(days: number): number {
    const blocks = (days / 6) * 86400;
    return blocks;
}

async function getAuctions(ctx: Ctx, auctions: Auction[]): Promise<Auction[]> {
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
            if (item.name == "Auctions.AuctionStarted") {
                let event = new AuctionsAuctionStartedEvent(ctx, item.event);
                if (event.isV9010) {
                    const auctionIndex = event.asV9010[0];
                    const auctionLeasePeriod = event.asV9010[1];
                    const auctionEndBlock = event.asV9010[2];
                    console.log(auctionEndBlock)
                    const biddingStarts = block.header.height + KusamaStartingPhase;

                    // ONBOARDING INFO
                    const onboardStartBlock = auctionLeasePeriod * KusamaSlotLeasePeriod + KusamaSlotLeaseOffset;
                    const onboardEndBlock = onboardStartBlock + daysToBlocks(KusamaLeasePeriodPerSlot * 6 * 7);
                    const biddingEndsBlock = biddingStarts + KusamaEndingPeriod;

                    // 0 implicates no end for now
                    const timestamp = new Timestamp({ start: BigInt(block.header.timestamp), end: BigInt(0) });
                    const auction = new Auction({
                        id: auctionIndex.toString(),
                        startBlock: block.header.height,
                        status: 'Ongoing',
                        onboardEndBlock,
                        onboardStartBlock,
                        biddingEndsBlock,
                        timestamp,
                        endPeriodBlock: biddingStarts
                    });
                    auctions.push(auction);
                }
            } else if (item.name == "Auctions.AuctionClosed") {
                let event = new AuctionsAuctionClosedEvent(ctx, item.event);
                if (event.isV9010) {
                    const auctionIndex = event.asV9010;
                    const auction = auctions.find(a => a.id == auctionIndex.toString())!;
                    auction.status = "Completed";
                    auction.timestamp!.end = BigInt(block.header.timestamp);
                    console.log(auction, block.header.height);
                    auctions = auctions.map(a => a.id == auctionIndex.toString() ? auction : a);
                }
            }
        }
    }
    return auctions;
}
