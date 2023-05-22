import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_} from "typeorm"

@Entity_()
export class Auction {
    constructor(props?: Partial<Auction>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @Column_("int4", {nullable: false})
    index!: number

    @Index_()
    @Column_("int4", {nullable: false})
    startBlock!: number

    @Index_()
    @Column_("text", {nullable: true})
    startHash!: string | undefined | null

    @Index_()
    @Column_("int4", {nullable: false})
    endPeriodBlock!: number

    @Column_("text", {nullable: false})
    endPeriodHash!: string

    @Column_("int4", {nullable: true})
    biddingEndsBlock!: number | undefined | null

    @Column_("text", {nullable: false})
    biddingEndsHash!: string

    @Column_("int4", {nullable: true})
    onboardStartBlock!: number | undefined | null

    @Column_("text", {nullable: false})
    onboardStartHash!: string

    @Column_("int4", {nullable: true})
    onboardEndBlock!: number | undefined | null

    @Column_("text", {nullable: false})
    onboardEndHash!: string

    @Column_("int4", {nullable: true})
    startDate!: number | undefined | null

    @Column_("int4", {nullable: true})
    endPeriodDate!: number | undefined | null

    @Column_("int4", {nullable: true})
    biddingEndsDate!: number | undefined | null

    @Column_("int4", {nullable: true})
    onboardStartDate!: number | undefined | null

    @Column_("int4", {nullable: true})
    onboardEndDate!: number | undefined | null
}
