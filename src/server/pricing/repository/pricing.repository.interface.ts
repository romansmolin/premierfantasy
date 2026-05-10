export interface IPricingRow {
    externalId: number
    currentPrice: number
}

export interface IUpsertPriceInput {
    playerId: string
    seasonYear: number
    basePrice: number
    currentPrice: number
    priceSource: 'MANUAL' | 'DERIVED' | 'BACKFILL_HASH'
}

export interface IPriceLookup {
    playerId: string
    currentPrice: number
}

export interface IPricingRepository {
    findBySeasonYear(seasonYear: number): Promise<IPricingRow[]>
    findManyByPlayerIds(playerIds: string[], seasonYear: number): Promise<IPriceLookup[]>
    upsertMany(rows: IUpsertPriceInput[]): Promise<{ updated: number; inserted: number }>
    findPlayerIdsByExternalIds(externalIds: number[]): Promise<Map<number, string>>
}
