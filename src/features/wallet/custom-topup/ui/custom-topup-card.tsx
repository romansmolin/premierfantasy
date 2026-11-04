'use client'

import { Coins01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { CheckoutCustomer } from '@/entities/wallet'
import { formatCents, MAX_TOPUP_CENTS, MIN_TOPUP_CENTS } from '@/entities/wallet'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'

import { useCustomTopup } from '../model/use-custom-topup'

const QUICK_AMOUNTS = ['5', '10', '25', '50']

export const CustomTopupCard = ({
    withdrawalConsent,
    getCustomer,
}: {
    withdrawalConsent: boolean
    getCustomer: () => Promise<CheckoutCustomer | null>
}) => {
    const { amount, setAmount, quote, checkout, isRedirecting } = useCustomTopup(getCustomer)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Choose your own amount</CardTitle>
                <CardDescription>
                    Enter what you want to spend and see the coins before you pay. Bigger top-ups earn a
                    better rate.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            €
                        </span>
                        <Input
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && quote.isValid && withdrawalConsent && !isRedirecting)
                                    checkout()
                            }}
                            inputMode="decimal"
                            placeholder="43.65"
                            aria-label="Amount to spend in euro"
                            aria-invalid={!!quote.error}
                            className="pl-7"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {QUICK_AMOUNTS.map((value) => (
                            <Button
                                key={value}
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setAmount(value)}
                            >
                                €{value}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border bg-muted/30 px-4 py-3">
                    {quote.isValid ? (
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon icon={Coins01Icon} size={20} className="text-amber-500" />
                                <div>
                                    <p className="text-xl font-bold tabular-nums">
                                        {quote.coins.toLocaleString()} coins
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {Math.round(quote.coinsPerEuro)} coins per €1 · €
                                        {formatCents(quote.amountCents)} total
                                    </p>
                                </div>
                            </div>
                            {quote.bonusPercent > 0 && (
                                <Badge className="shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                    +{quote.bonusPercent}% bonus
                                </Badge>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {quote.error ??
                                `Enter an amount between €${formatCents(MIN_TOPUP_CENTS)} and €${formatCents(MAX_TOPUP_CENTS)}.`}
                        </p>
                    )}
                </div>

                <Button
                    className="w-full gap-2"
                    disabled={!quote.isValid || !withdrawalConsent || isRedirecting}
                    onClick={checkout}
                >
                    <HugeiconsIcon icon={Coins01Icon} size={16} />
                    {isRedirecting
                        ? 'Redirecting…'
                        : quote.isValid
                          ? `Pay €${formatCents(quote.amountCents)} for ${quote.coins.toLocaleString()} coins`
                          : 'Enter an amount'}
                </Button>

                <p className="text-xs text-muted-foreground">
                    Final coins are confirmed by the server at checkout. Payment is handled by our secure
                    processor — card details never reach this app.
                </p>
            </CardContent>
        </Card>
    )
}
