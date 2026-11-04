import {
    coinsForAmountCents,
    formatCents,
    MAX_TOPUP_CENTS,
    MIN_TOPUP_CENTS,
} from '@/entities/wallet/model/coin-pricing'

const amounts = [200, 800, 1400]

export function PricingSection() {
    return (
        <section id="pricing" className="scroll-mt-28 py-10 md:py-16">
            <div className="mx-auto max-w-5xl space-y-8 px-6">
                <div className="space-y-3">
                    <h2 className="font-heading text-3xl font-semibold md:text-4xl">Pricing</h2>
                    <p className="text-muted-foreground">
                        The core game is free. Coin purchases are optional and unlock AI features.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    {amounts.map((cents) => (
                        <div key={cents} className="rounded-xl border p-6">
                            <p className="text-2xl font-semibold">
                                {coinsForAmountCents(cents).toLocaleString('en')} Coins
                            </p>
                            <p className="mt-2 text-muted-foreground">€{formatCents(cents)}</p>
                        </div>
                    ))}
                </div>
                <p className="text-sm text-muted-foreground">
                    You can also choose a top-up from €{formatCents(MIN_TOPUP_CENTS)} to €
                    {formatCents(MAX_TOPUP_CENTS)}. The exact number of Coins is shown before payment.
                </p>
                <div className="space-y-2 text-sm">
                    <h3 className="font-semibold">AI feature prices</h3>
                    <p>
                        Transfer Suggestions: 500 Coins · Player Analytics: 300 Coins · Match Predictions: 300
                        Coins
                    </p>
                </div>
            </div>
        </section>
    )
}
