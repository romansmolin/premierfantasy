import { Errors } from '@/shared/lib/http'

import type { ICsvUpsertResult, IPricingService } from './pricing.service.interface'
import type {
    IPricingRepository,
    IPricingRow,
    IUpsertPriceInput,
} from '../repository/pricing.repository.interface'

const PRICE_DRIFT_TOLERANCE = 0.01

export class PricingService implements IPricingService {
    private readonly pricingRepository: IPricingRepository

    constructor(pricingRepository: IPricingRepository) {
        this.pricingRepository = pricingRepository
    }

    async getPricesForSeason(seasonYear: number): Promise<IPricingRow[]> {
        return this.pricingRepository.findBySeasonYear(seasonYear)
    }

    async upsertFromCsv(seasonYear: number, csv: string): Promise<ICsvUpsertResult> {
        const lines = csv
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0)

        if (lines.length === 0) throw Errors.badRequest('CSV is empty')

        const header = lines[0].split(',').map((c) => c.trim())
        const externalIdCol = header.indexOf('external_id')
        const priceCol = header.indexOf('base_price')

        if (externalIdCol === -1 || priceCol === -1) {
            throw Errors.badRequest('CSV must have headers: external_id, base_price')
        }

        const parsed: Array<{ externalId: number; price: number; line: number }> = []
        const errors: string[] = []

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.trim())
            const externalId = Number(cols[externalIdCol])
            const price = Number(cols[priceCol])

            if (!Number.isInteger(externalId) || externalId <= 0) {
                errors.push(`Line ${i + 1}: invalid external_id "${cols[externalIdCol]}"`)
                continue
            }

            if (!Number.isFinite(price) || price < 0) {
                errors.push(`Line ${i + 1}: invalid base_price "${cols[priceCol]}"`)
                continue
            }

            parsed.push({ externalId, price, line: i + 1 })
        }

        if (errors.length > 0) {
            throw Errors.badRequest('CSV has invalid rows', { errors })
        }

        const externalIds = parsed.map((r) => r.externalId)
        const playerIdMap = await this.pricingRepository.findPlayerIdsByExternalIds(externalIds)

        const unknown: string[] = []
        const upsertRows: IUpsertPriceInput[] = []

        for (const row of parsed) {
            const playerId = playerIdMap.get(row.externalId)

            if (!playerId) {
                unknown.push(`Line ${row.line}: external_id ${row.externalId} not found`)
                continue
            }

            upsertRows.push({
                playerId,
                seasonYear,
                basePrice: row.price,
                currentPrice: row.price,
                priceSource: 'MANUAL',
            })
        }

        if (unknown.length > 0) {
            throw Errors.unprocessable('Unknown external_ids in CSV', { errors: unknown })
        }

        const result = await this.pricingRepository.upsertMany(upsertRows)

        return {
            accepted: upsertRows.length,
            inserted: result.inserted,
            updated: result.updated,
        }
    }

    async validateClientPrices(
        items: Array<{ playerId: string; price: number }>,
        seasonYear: number,
    ): Promise<void> {
        if (items.length === 0) return

        const canonical = await this.pricingRepository.findManyByPlayerIds(
            items.map((i) => i.playerId),
            seasonYear,
        )
        const priceMap = new Map(canonical.map((c) => [c.playerId, c.currentPrice]))

        const mismatches: string[] = []

        for (const item of items) {
            const canonicalPrice = priceMap.get(item.playerId)

            if (canonicalPrice === undefined) {
                mismatches.push(`No price set for player ${item.playerId}`)
                continue
            }

            if (Math.abs(canonicalPrice - item.price) > PRICE_DRIFT_TOLERANCE) {
                mismatches.push(
                    `Player ${item.playerId}: client sent ${item.price}, canonical is ${canonicalPrice}`,
                )
            }
        }

        if (mismatches.length > 0) {
            throw Errors.unprocessable('Price mismatch — refresh and retry', { mismatches })
        }
    }
}
