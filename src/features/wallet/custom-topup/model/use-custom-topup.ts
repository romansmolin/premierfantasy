'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { parseAmountToCents, quoteForAmountCents, walletService } from '@/entities/wallet'
import type { CoinQuote } from '@/entities/wallet'

import { ApiError } from '@/shared/api/api-error'

const EMPTY_QUOTE: CoinQuote = {
    amountCents: 0,
    coins: 0,
    coinsPerEuro: 0,
    bonusPercent: 0,
    isValid: false,
    error: null,
}

/**
 * Live coin quote for a typed euro amount, plus checkout.
 *
 * The quote is computed locally purely so the number updates as the user types;
 * the server recomputes it from the same table when the checkout is created, and
 * that result is what gets charged and credited.
 */
export function useCustomTopup() {
    const [amount, setAmount] = useState('')
    const [isRedirecting, setIsRedirecting] = useState(false)

    const quote = useMemo<CoinQuote>(() => {
        if (amount.trim() === '') return EMPTY_QUOTE

        const cents = parseAmountToCents(amount)

        if (cents === null) {
            return { ...EMPTY_QUOTE, error: 'Enter an amount like 43.65' }
        }

        return quoteForAmountCents(cents)
    }, [amount])

    const checkout = async () => {
        if (!quote.isValid) return

        setIsRedirecting(true)

        try {
            const result = await walletService.createCustomCheckout(quote.amountCents)

            window.location.href = result.redirectUrl
        } catch (error) {
            toast.error(
                ApiError.isApiError(error) ? error.message : 'Failed to start checkout. Please try again.',
            )
            setIsRedirecting(false)
        }
    }

    return { amount, setAmount, quote, checkout, isRedirecting }
}
