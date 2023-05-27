import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_} from "typeorm"
import * as marshal from "./marshal"
import {BlockInfo} from "./_blockInfo"
import {Timestamp} from "./_timestamp"

@Entity_()
export class Auction {
    constructor(props?: Partial<Auction>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Column_("text", {nullable: false})
    status!: string

    @Column_("jsonb", {transformer: {to: obj => obj.toJSON(), from: obj => obj == null ? undefined : new BlockInfo(undefined, obj)}, nullable: false})
    startBlock!: BlockInfo

    @Column_("jsonb", {transformer: {to: obj => obj.toJSON(), from: obj => obj == null ? undefined : new BlockInfo(undefined, obj)}, nullable: false})
    endPeriodBlock!: BlockInfo

    @Column_("jsonb", {transformer: {to: obj => obj.toJSON(), from: obj => obj == null ? undefined : new BlockInfo(undefined, obj)}, nullable: false})
    biddingStartBlock!: BlockInfo

    @Column_("jsonb", {transformer: {to: obj => obj.toJSON(), from: obj => obj == null ? undefined : new BlockInfo(undefined, obj)}, nullable: false})
    biddingEndsBlock!: BlockInfo

    @Column_("jsonb", {transformer: {to: obj => obj.toJSON(), from: obj => obj == null ? undefined : new BlockInfo(undefined, obj)}, nullable: false})
    onboardStartBlock!: BlockInfo

    @Column_("jsonb", {transformer: {to: obj => obj.toJSON(), from: obj => obj == null ? undefined : new BlockInfo(undefined, obj)}, nullable: false})
    onboardEndBlock!: BlockInfo

    @Column_("jsonb", {transformer: {to: obj => obj == null ? undefined : obj.toJSON(), from: obj => obj == null ? undefined : new Timestamp(undefined, obj)}, nullable: true})
    timestamp!: Timestamp | undefined | null
}
