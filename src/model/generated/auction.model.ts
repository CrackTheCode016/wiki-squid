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
    startBlock!: number

    @Column_("int4", {nullable: false})
    endPeriodBlock!: number

    @Column_("int4", {nullable: true})
    biddingEndsBlock!: number | undefined | null

    @Column_("int4", {nullable: true})
    onboardStartBlock!: number | undefined | null

    @Column_("int4", {nullable: true})
    onboardEndBlock!: number | undefined | null
}
