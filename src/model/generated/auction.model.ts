import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
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

    @Index_()
    @Column_("int4", {nullable: false})
    startBlock!: number

    @Column_("int4", {nullable: false})
    endPeriodBlock!: number

    @Column_("int4", {nullable: true})
    biddingEndsBlock!: number | undefined | null

    @Column_("int4", {nullable: true})
    onboardStartBlock!: number | undefined | null

    @Column_("int4", {nullable: true})
    onboardEndBlock!: number | undefined | null

    @Column_("jsonb", {transformer: {to: obj => obj == null ? undefined : obj.toJSON(), from: obj => obj == null ? undefined : new Timestamp(undefined, obj)}, nullable: true})
    timestamp!: Timestamp | undefined | null
}
