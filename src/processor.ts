import { lookupArchive } from "@subsquid/archive-registry"
import * as ss58 from "@subsquid/ss58"
import { BatchContext, BatchProcessorItem, SubstrateBatchProcessor } from "@subsquid/substrate-processor"
import { Store, TypeormDatabase } from "@subsquid/typeorm-store"
import { In } from "typeorm"
import { Account, Auction, BlockInfo, Timestamp, Transfer } from "./model"
import { AuctionsAuctionClosedEvent, AuctionsAuctionStartedEvent, BalancesTransferEvent } from "./types/events"
import { AuctionsAuctionInfoStorage } from "./types/storage"

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
    let availableAuctions = await ctx.store.findBy(Auction, {})
    let blockInfo = await saveBlockInfo(ctx)
    let auctions = await getAuctions(ctx, availableAuctions, blockInfo)

    await ctx.store.save(auctions)
})

function daysToBlocks(days: number): number {
    const blocks = (days / 6) * 86400;
    return blocks;
}

async function saveBlockInfo(ctx: Ctx): Promise<BlockInfo[]> {
    return ctx.blocks.map(({ header }) => new BlockInfo({
        id: header.height.toString(),
        height: header.height,
        timestamp: BigInt(header.timestamp),
        hash: header.hash
    }))
}

// Returns block info for a specific block height in the future.
function predictBlockInfoData(blockHeight: number, currentTime: number, currentBlockHeight: number): BlockInfo {
    const milliseconds = ((blockHeight - currentBlockHeight) * 6) * 1000;
    const predictedTime = currentTime + milliseconds;
    return new BlockInfo({
        id: blockHeight.toString(),
        height: blockHeight,
        timestamp: BigInt(predictedTime),
        hash: ""
    })
}

async function getAuctions(ctx: Ctx, auctions: Auction[], blockInfo: BlockInfo[]): Promise<Auction[]> {

    for (let block of ctx.blocks) {
        // events
        for (let item of block.items) {
            if (item.name == "Auctions.AuctionStarted") {
                let event = new AuctionsAuctionStartedEvent(ctx, item.event);
                if (event.isV9010) {
                    // GENERAL INFO (from event)
                    const auctionIndex = event.asV9010[0];
                    const auctionLeasePeriod = event.asV9010[1];
                    const auctionEndBlock = event.asV9010[2];

                    // BIDDING INFO
                    const biddingStarts = block.header.height + KusamaStartingPhase;
                    const biddingEndsBlock = biddingStarts + KusamaEndingPeriod;

                    // ONBOARDING INFO
                    const onboardStartBlock = auctionLeasePeriod * KusamaSlotLeasePeriod + KusamaSlotLeaseOffset;
                    const onboardEndBlock = onboardStartBlock + daysToBlocks(KusamaLeasePeriodPerSlot * 6 * 7);


                    const startBlock = blockInfo.find(b => b.height === block.header.height)!;

                    const biddingStartsInfo = predictBlockInfoData(biddingStarts, block.header.timestamp, block.header.height);
                    const onboardStartBlockInfo = predictBlockInfoData(onboardStartBlock, block.header.timestamp, block.header.height);
                    const onboardEndBlockInfo = predictBlockInfoData(onboardEndBlock, block.header.timestamp, block.header.height);
                    const biddingEndsBlockInfo = predictBlockInfoData(biddingEndsBlock, block.header.timestamp, block.header.height);

                    const timestamp = new Timestamp({ start: BigInt(block.header.timestamp), end: BigInt(0) });
                    const auction = new Auction({
                        id: auctionIndex.toString(),
                        startBlock,
                        status: 'Ongoing',
                        onboardEndBlock: onboardEndBlockInfo,
                        onboardStartBlock: onboardStartBlockInfo,
                        biddingEndsBlock: biddingEndsBlockInfo,
                        biddingStartBlock: biddingStartsInfo,
                        timestamp,
                        endPeriodBlock: startBlock
                    });
                    auctions.push(auction);
                }
            }

            if (item.name == "Auctions.AuctionClosed") {
                let event = new AuctionsAuctionClosedEvent(ctx, item.event);
                if (event.isV9010) {
                    const auctionIndex = event.asV9010;
                    const auction = auctions.find(a => a.id == auctionIndex.toString())!;
                    auction.status = "Completed";
                    auction.timestamp!.end = BigInt(block.header.timestamp);
                    auctions = auctions.map(a => a.id == auctionIndex.toString() ? auction : a);
                }
            }
        }
    }
    return auctions;
}
