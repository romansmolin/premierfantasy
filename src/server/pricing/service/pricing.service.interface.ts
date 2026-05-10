import type { IPricingRow } from '../repository/pricing.repository.interface'

export interface ICsvUpsertResult {
    accepted: number
    inserted: number
    updated: number
}

export interface IPricingService {
    getPricesForSeason(seasonYear: number): Promise<IPricingRow[]>
    upsertFromCsv(seasonYear: number, csv: string): Promise<ICsvUpsertResult>
    validateClientPrices(items: Array<{ playerId: string; price: number }>, seasonYear: number): Promise<void>
}
