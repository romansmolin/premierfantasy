import Link from 'next/link'

import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader } from '@/shared/ui/card'
import { formatChance } from '@/shared/utils/format-chance'

import { bucketBars } from './charts/chart-data'
import { GoalOutlookChart } from './charts/goal-outlook-chart'
import { PointsDistributionChart } from './charts/points-distribution-chart'
import { formatDate, formatMinutes, formatPoints } from './format'

import type { PlayerProbabilityCard } from '@/server/stats/service/stats.service.interface'

function ForecastTitle() {
    return (
        <h2 data-slot="card-title" className="text-sm font-medium">
            Forecast · next match
        </h2>
    )
}

const HowWeCalculate = () => (
    <Link href="/how-we-calculate" className="underline underline-offset-4 hover:text-foreground">
        How we calculate
    </Link>
)

function Note({ children }: { children: React.ReactNode }) {
    return (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">No forecast</Badge>
            <span>{children}</span>
        </p>
    )
}

function Figure({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
    return (
        <div className={wide ? 'col-span-2 space-y-1 sm:col-span-1' : 'space-y-1'}>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    )
}

/** Forecast block of the player page: next-match figures, explanation and the two forecast charts. */
export function ProbabilityCard({
    card,
    forecastOn,
}: {
    card: PlayerProbabilityCard | null
    forecastOn: boolean
}) {
    if (!forecastOn) {
        return (
            <Note>
                The forecast is switched off until it beats a simple baseline. Facts are below.{' '}
                <HowWeCalculate />.
            </Note>
        )
    }

    if (card === null || (card.matches.length === 0 && !card.lowData)) {
        return (
            <Note>
                No forecast for this player right now (no upcoming match or no fresh evaluation). Facts are
                below. <HowWeCalculate />.
            </Note>
        )
    }

    if (card.lowData) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <ForecastTitle />
                        <Badge variant="secondary">Forecast</Badge>
                    </div>
                    <CardDescription>Not enough data yet: fewer than 3 appearances</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const next = card.matches[0]
    const outcome = [next.pWin, next.pDraw, next.pLose]
    const outcomeText = outcome.every((p) => p === null)
        ? '—'
        : `${formatChance(next.pWin)} / ${formatChance(next.pDraw)} / ${formatChance(next.pLose)}`
    const figures: [string, string, boolean?][] = [
        ['Chance to score', formatChance(next.pGoal)],
        ['Chance to assist', formatChance(next.pAssist)],
        ['Chance to start', formatChance(next.pStart)],
        ['Expected minutes', formatMinutes(next.expectedMinutes)],
        ['Expected points', formatPoints(next.expectedPoints)],
        ['Team win / draw / lose', outcomeText, true],
    ]
    const hidden = figures.some(([, value]) => value === '—')
    const nextLabel = `${next.isHome ? 'vs' : 'at'} ${next.opponentName}`
    const bars = bucketBars(next.pointsBuckets)

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <ForecastTitle />
                        <Badge variant="secondary">Forecast</Badge>
                    </div>
                    <CardDescription>
                        {nextLabel} ({next.isHome ? 'home' : 'away'}) · {formatDate(next.kickoff)}
                        {card.matches.length > 1 &&
                            '. Figures are for the next match only; later matches are in the chart below.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {figures.map(([label, value, wide]) => (
                            <Figure key={label} label={label} value={value} wide={wide} />
                        ))}
                    </div>
                    {hidden && card.offReasons.length > 0 && (
                        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                            {card.offReasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Forecast · model {card.modelVersion} · updated {formatDate(card.updatedAt)} ·{' '}
                        <HowWeCalculate />
                    </p>
                </CardContent>
            </Card>

            {card.explanation.length > 0 && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                    {card.explanation.slice(0, 3).join(' ')}
                </p>
            )}

            <GoalOutlookChart matches={card.matches} />
            {bars !== null && <PointsDistributionChart bars={bars} matchLabel={nextLabel} />}
        </div>
    )
}
