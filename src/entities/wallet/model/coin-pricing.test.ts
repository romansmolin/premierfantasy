import { describe, expect, it } from 'vitest'

import { COIN_PACKS } from '@/server/wallet/lib/coin-pricing'

import {
    coinsForAmountCents,
    MAX_TOPUP_CENTS,
    MIN_TOPUP_CENTS,
    parseAmountToCents,
    quoteForAmountCents,
} from './coin-pricing'

describe('coinsForAmountCents', () => {
    it('matches every published coin pack exactly at its price', () => {
        for (const pack of COIN_PACKS) {
            expect(coinsForAmountCents(pack.priceCents)).toBe(pack.coins)
        }
    })

    it('prices the worked example', () => {
        // €43.65 → 100 + 400 + 500 + floor(2965 * 5/6)
        expect(coinsForAmountCents(4365)).toBe(3470)
    })

    it('is monotonic — paying more never yields fewer coins', () => {
        let previous = 0

        for (let cents = 1; cents <= 5000; cents += 7) {
            const coins = coinsForAmountCents(cents)

            expect(coins).toBeGreaterThanOrEqual(previous)
            previous = coins
        }
    })

    it('improves the rate as the amount grows', () => {
        const rate = (cents: number) => coinsForAmountCents(cents) / cents

        expect(rate(200)).toBeLessThan(rate(800))
        expect(rate(800)).toBeLessThan(rate(1400))
        expect(rate(1400)).toBeLessThan(rate(10_000))
    })

    it('never over-credits — always rounds down', () => {
        // 4365 cents is 3470.83 coins before flooring.
        expect(coinsForAmountCents(4365)).toBe(3470)
        // 101 cents is 50.5 coins before flooring.
        expect(coinsForAmountCents(101)).toBe(50)
    })

    it('returns nothing for zero, negative, or non-finite input', () => {
        expect(coinsForAmountCents(0)).toBe(0)
        expect(coinsForAmountCents(-500)).toBe(0)
        expect(coinsForAmountCents(Number.NaN)).toBe(0)
    })
})

describe('parseAmountToCents', () => {
    it('parses plain and decimal amounts', () => {
        expect(parseAmountToCents('43.65')).toBe(4365)
        expect(parseAmountToCents('10')).toBe(1000)
        expect(parseAmountToCents('2.5')).toBe(250)
        expect(parseAmountToCents(' 8.00 ')).toBe(800)
    })

    it('accepts a comma decimal separator', () => {
        expect(parseAmountToCents('43,65')).toBe(4365)
    })

    it('avoids float drift on awkward amounts', () => {
        // 0.1 + 0.2 style errors must never reach the cent value.
        expect(parseAmountToCents('0.29')).toBe(29)
        expect(parseAmountToCents('1.10')).toBe(110)
        expect(parseAmountToCents('70.07')).toBe(7007)
    })

    it('rejects anything that is not a plain amount', () => {
        for (const input of ['', 'abc', '1.234', '-5', '1e3', '1.2.3', '€5', '5 EUR']) {
            expect(parseAmountToCents(input)).toBeNull()
        }
    })
})

describe('quoteForAmountCents', () => {
    it('quotes a valid amount with its rate and bonus', () => {
        const quote = quoteForAmountCents(4365)

        expect(quote).toMatchObject({ coins: 3470, isValid: true, error: null })
        expect(quote.coinsPerEuro).toBeCloseTo(79.5, 1)
        expect(quote.bonusPercent).toBeGreaterThan(0)
    })

    it('reports no bonus at the entry-level rate', () => {
        expect(quoteForAmountCents(200).bonusPercent).toBe(0)
    })

    it('rejects amounts below the minimum', () => {
        const quote = quoteForAmountCents(MIN_TOPUP_CENTS - 1)

        expect(quote.isValid).toBe(false)
        expect(quote.error).toContain('Minimum')
    })

    it('rejects amounts above the maximum', () => {
        const quote = quoteForAmountCents(MAX_TOPUP_CENTS + 1)

        expect(quote.isValid).toBe(false)
        expect(quote.error).toContain('Maximum')
    })

    it('rejects zero and fractional cents', () => {
        expect(quoteForAmountCents(0).isValid).toBe(false)
        expect(quoteForAmountCents(10.5).isValid).toBe(false)
    })
})
