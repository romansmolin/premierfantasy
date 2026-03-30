export const COIN_PACKS = [
    { coins: 100, priceCents: 200, currency: 'EUR', label: '100 coins — \u20AC2.00' },
    { coins: 500, priceCents: 800, currency: 'EUR', label: '500 coins — \u20AC8.00' },
    { coins: 1000, priceCents: 1400, currency: 'EUR', label: '1,000 coins — \u20AC14.00' },
] as const

export type CoinPack = (typeof COIN_PACKS)[number]

export function getCoinPack(coins: number): CoinPack | undefined {
    return COIN_PACKS.find((p) => p.coins === coins)
}
