import { KnownArchivesSubstrate, lookupArchive } from "@subsquid/archive-registry"
import { BatchContext, BatchProcessorItem, SubstrateBatchProcessor } from "@subsquid/substrate-processor"
import { Store, TypeormDatabase } from "@subsquid/typeorm-store"
import { Auction, BlockInfo, Timestamp } from "./model"
import { AuctionsAuctionClosedEvent, AuctionsAuctionStartedEvent, BalancesTransferEvent } from "./types/events"

interface AuctionOptions {
    SlotLeasePeriod: number;
    SlotLeaseOffset: number;
    LeasePeriodPerSlot: number;
    StartingPhase: number;
    EndingPeriod: number;
    WeeksPerPeriod: number;
}

// Auction variables for Polkadot and Kusama
const polkadotAuctionOptions: AuctionOptions = {
    SlotLeasePeriod: 1209600,
    SlotLeaseOffset: 921600,
    LeasePeriodPerSlot: 8,
    WeeksPerPeriod: 12,
    StartingPhase: 27000,
    EndingPeriod: 72000
}

const kusamaAuctionOptions: AuctionOptions = {
    SlotLeasePeriod: 604800,
    SlotLeaseOffset: 72000,
    LeasePeriodPerSlot: 8,
    WeeksPerPeriod: 6,
    StartingPhase: 27000,
    EndingPeriod: 72000
}

// Gets the network (NETWORK) type from .env file
const getNetwork = (): KnownArchivesSubstrate => process.env.NETWORK! as KnownArchivesSubstrate;
const getStartingHeight = (): number => parseInt(process.env.STARTING_HEIGHT!);

const processor = new SubstrateBatchProcessor()
    .setDataSource({
        // Use archive created by archive/docker-compose.yml
        archive: lookupArchive(getNetwork(), { release: 'FireSquid' })
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
    .setBlockRange({
        from: getStartingHeight()
    })

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

/** 
 * Parses out blocks into a more digestable format
*/
async function saveBlockInfo(ctx: Ctx): Promise<BlockInfo[]> {
    return ctx.blocks.map(({ header }) => new BlockInfo({
        id: header.height.toString(),
        height: header.height,
        timestamp: BigInt(header.timestamp),
        hash: header.hash
    }))
}

/** 
 * Returns block info for a specific block height in the future.
*/
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

/** 
 *  Filters out auctions every chunk of blocks.
 *  If an auction has started, it is included as "Ongoing".
 *  If an auction has been stated as closed, then it is concluded as "Complete" and the timestamp is complete.
 * */
async function getAuctions(ctx: Ctx, auctions: Auction[], blockInfo: BlockInfo[]): Promise<Auction[]> {
    let options: AuctionOptions = getNetwork() == "polkadot" ? polkadotAuctionOptions : kusamaAuctionOptions;
    // Blocks
    for (let block of ctx.blocks) {
        // Events
        for (let item of block.items) {
            // Check if some auction has started
            if (item.name == "Auctions.AuctionStarted") {
                let event = new AuctionsAuctionStartedEvent(ctx, item.event);
                console.log(event.isV9010, event.isV9230)
                if (event.isV9010 || event.isV9230) {
                    // GENERAL INFO (from event)

                    const auctionIndex = event.isV9010 == true ? event.asV9010[0] : event.asV9230.auctionIndex;
                    const auctionLeasePeriod = event.isV9010 == true ? event.asV9010[1] : event.asV9230.leasePeriod;

                    // BIDDING INFO - defines the start and ending of the bidding phase
                    const biddingStarts = block.header.height + options.StartingPhase;
                    const biddingEndsBlock = biddingStarts + options.EndingPeriod;

                    // ONBOARDING INFO - defines the lease start and end
                    // Take the lease period from the event, and convert to blocks (SlotLeasePeriod = the amount of blocks per period).
                    // Add an offset to mitigate any inaccuracies when converting

                    const onboardStartBlock = auctionLeasePeriod * options.SlotLeasePeriod + options.SlotLeaseOffset;
                    // Convert to weeks (periods per slot * the weeks per period, chain dependent) -> convert to days -> convert to blocks
                    const onboardEndBlock = onboardStartBlock + daysToBlocks((options.LeasePeriodPerSlot * options.WeeksPerPeriod) * 7);
                    const startBlock = blockInfo.find(b => b.height === block.header.height)!;

                    // Convert to BlockInfo, giving us unix timestamps and block heights
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
