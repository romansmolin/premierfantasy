/**
 * Coin pricing for a free-chosen top-up amount.
 *
 * Progressive brackets, like tax bands: each slice of the amount converts at its
 * own rate, and the rate improves as the total grows. The band edges and rates
 * are chosen so a custom amount landing on a pack price yields exactly the pack's
 * coins — €2.00 → 100, €8.00 → 500, €14.00 → 1,000 — so the two ways to buy can
 * never quote different numbers for the same money.
 *
 * Rates are held as sixths so the whole calculation is integer arithmetic; money
 * must never ride on binary floats.
 */
export const MIN_TOPUP_CENTS = 100
export const MAX_TOPUP_CENTS = 50_000
export const TOPUP_CURRENCY = 'EUR'

interface PricingBand {
    /** Exclusive upper edge of the band, in cents. Null means "everything above". */
    upToCents: number | null
    /** Coins per cent, expressed as sixths (3 = 0.5 coins/cent). */
    sixthsPerCent: number
}

const BANDS: PricingBand[] = [
    { upToCents: 200, sixthsPerCent: 3 },
    { upToCents: 800, sixthsPerCent: 4 },
    { upToCents: 1400, sixthsPerCent: 5 },
    { upToCents: null, sixthsPerCent: 5 },
]

/** Coins awarded for a whole-cent amount. Always rounds down — never over-credit. */
export function coinsForAmountCents(amountCents: number): number {
    if (!Number.isFinite(amountCents) || amountCents <= 0) return 0

    const cents = Math.floor(amountCents)

    let remaining = cents
    let consumed = 0
    let sixths = 0

    for (const band of BANDS) {
        if (remaining <= 0) break

        const bandWidth = band.upToCents === null ? remaining : band.upToCents - consumed

        if (bandWidth <= 0) continue

        const slice = Math.min(remaining, bandWidth)

        sixths += slice * band.sixthsPerCent
        remaining -= slice
        consumed += slice
    }

    return Math.floor(sixths / 6)
}

export interface CoinQuote {
    amountCents: number
    coins: number
    /** Coins per euro at this amount, for display. */
    coinsPerEuro: number
    /** Uplift over the entry-level rate, as a whole percent. 0 in the first band. */
    bonusPercent: number
    isValid: boolean
    error: string | null
}

const BASE_COINS_PER_EURO = 50

/**
 * Parses a user-typed amount ("43.65", "43,65") into whole cents.
 * Returns null for anything that is not a plain amount with at most two decimals.
 */
export function parseAmountToCents(input: string): number | null {
    const trimmed = input.trim().replace(',', '.')

    if (!/^\d{1,6}(\.\d{1,2})?$/.test(trimmed)) return null

    const [whole, fraction = ''] = trimmed.split('.')
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))

    return Number.isSafeInteger(cents) ? cents : null
}

export const formatCents = (cents: number): string => (cents / 100).toFixed(2)

/** Full quote for an amount, including why it is unusable. */
export function quoteForAmountCents(amountCents: number): CoinQuote {
    const empty: CoinQuote = {
        amountCents,
        coins: 0,
        coinsPerEuro: 0,
        bonusPercent: 0,
        isValid: false,
        error: null,
    }

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
        return { ...empty, error: 'Enter an amount' }
    }

    if (amountCents < MIN_TOPUP_CENTS) {
        return { ...empty, error: `Minimum top-up is €${formatCents(MIN_TOPUP_CENTS)}` }
    }

    if (amountCents > MAX_TOPUP_CENTS) {
        return { ...empty, error: `Maximum top-up is €${formatCents(MAX_TOPUP_CENTS)}` }
    }

    const coins = coinsForAmountCents(amountCents)
    const coinsPerEuro = (coins / amountCents) * 100

    return {
        amountCents,
        coins,
        coinsPerEuro,
        bonusPercent: Math.round((coinsPerEuro / BASE_COINS_PER_EURO - 1) * 100),
        isValid: true,
        error: null,
    }
}
