import { useMemo } from 'react'
import useSWR from 'swr'

import { pricingService, type PriceRow } from '../api/pricing.service'

const CURRENT_SEASON_YEAR = 2025

const FALLBACK_PRICE_BY_POSITION = {
    GK: 4.5,
    DEF: 4.5,
    MID: 5.5,
    FWD: 6.5,
} as const

export type PriceMap = Map<number, number>

export function usePrices(seasonYear: number = CURRENT_SEASON_YEAR) {
    const { data, error, isLoading } = useSWR<PriceRow[]>(
        ['pricing', seasonYear],
        () => pricingService.getBySeason(seasonYear),
        { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
    )

    const priceMap: PriceMap = useMemo(() => {
        const map = new Map<number, number>()

        if (data) {
            for (const row of data) map.set(row.externalId, row.currentPrice)
        }

        return map
    }, [data])

    return { priceMap, isLoading, error }
}

export function getFallbackPrice(position: keyof typeof FALLBACK_PRICE_BY_POSITION): number {
    return FALLBACK_PRICE_BY_POSITION[position]
}
