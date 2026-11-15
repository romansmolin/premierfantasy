import { AI_FEATURE_LABELS, AI_FEATURE_PRICES } from '@/entities/ai'
import type { AiFeature } from '@/entities/ai'
import {
    coinsForAmountCents,
    formatCents,
    MAX_TOPUP_CENTS,
    MIN_TOPUP_CENTS,
} from '@/entities/wallet/model/coin-pricing'

const amounts = [200, 800, 1400]

const availableFeatures: AiFeature[] = ['PLAYER_ANALYSIS', 'MATCH_PREDICTION']
const upcomingFeatures: AiFeature[] = ['SQUAD_REVIEW', 'AUTO_BUILD']

export function PricingSection() {
    return (
        <section id="pricing" className="scroll-mt-28 py-10 md:py-16">
            <div className="mx-auto max-w-5xl space-y-8 px-6">
                <div className="space-y-3">
                    <h2 className="font-heading text-3xl font-semibold md:text-4xl">Pricing</h2>
                    <p className="text-muted-foreground">
                        Statistics are free. Credits pay for AI features, and Credits never expire.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    {amounts.map((cents) => (
                        <div key={cents} className="rounded-xl border p-6">
                            <p className="text-2xl font-semibold">
                                {coinsForAmountCents(cents).toLocaleString('en')} Credits
                            </p>
                            <p className="mt-2 text-muted-foreground">€{formatCents(cents)}</p>
                        </div>
                    ))}
                </div>
                <p className="text-sm text-muted-foreground">
                    You can also choose a top-up from €{formatCents(MIN_TOPUP_CENTS)} to €
                    {formatCents(MAX_TOPUP_CENTS)}. The exact number of Credits is shown before payment.
                </p>
                <div className="space-y-2 text-sm">
                    <h3 className="font-semibold">AI feature prices</h3>
                    <ul className="space-y-1">
                        {availableFeatures.map((feature) => (
                            <li key={feature}>
                                {AI_FEATURE_LABELS[feature]}: {AI_FEATURE_PRICES[feature]} Credits
                            </li>
                        ))}
                        {upcomingFeatures.map((feature) => (
                            <li key={feature} className="text-muted-foreground">
                                {AI_FEATURE_LABELS[feature]}: {AI_FEATURE_PRICES[feature]} Credits (coming
                                soon)
                            </li>
                        ))}
                    </ul>
                    <p className="text-muted-foreground">
                        Re-opening a report you already paid for is free (match predictions always, player
                        analyses for 7 days). Unused Credits can be refunded within 14 days of purchase.
                    </p>
                </div>
            </div>
        </section>
    )
}
