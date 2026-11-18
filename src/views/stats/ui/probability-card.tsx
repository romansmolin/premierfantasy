import Link from 'next/link'

import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { formatChance } from '@/shared/utils/format-chance'

import { bucketBars } from './charts/chart-data'
import { GoalOutlookChart } from './charts/goal-outlook-chart'
import { PointsDistributionChart } from './charts/points-distribution-chart'
import { formatDate, formatMinutes, formatPoints } from './format'

import type { PlayerProbabilityCard } from '@/server/stats/service/stats.service.interface'

const HowWeCalculate = () => (
    <Link href="/how-we-calculate" className="underline underline-offset-4 hover:text-foreground">
        How we calculate
    </Link>
)

function Note({ children }: { children: React.ReactNode }) {
    return (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">Forecast</Badge>
            <span>{children}</span>
        </p>
    )
}

function Figure({
    label,
    value,
    why,
    wide,
}: {
    label: string
    value: string
    why: string | undefined
    wide?: boolean
}) {
    return (
        <div
            className={wide ? 'col-span-2 space-y-1 sm:col-span-1' : 'space-y-1'}
            title={value === '—' ? why : undefined}
        >
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
                        <CardTitle>Forecast · next match</CardTitle>
                        <Badge variant="secondary">Forecast</Badge>
                    </div>
                    <CardDescription>Not enough data yet: fewer than 3 appearances</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const next = card.matches[0]
    const why = card.offReasons.length > 0 ? card.offReasons.join(' ') : undefined
    const outcome = [next.pWin, next.pDraw, next.pLose]
    const outcomeText = outcome.every((p) => p === null)
        ? '—'
        : `${formatChance(next.pWin)} / ${formatChance(next.pDraw)} / ${formatChance(next.pLose)}`
    const nextLabel = `${next.isHome ? 'vs' : 'at'} ${next.opponentName}`
    const bars = bucketBars(next.pointsBuckets)

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle>Forecast · next match</CardTitle>
                        <Badge variant="secondary">Forecast</Badge>
                    </div>
                    <CardDescription>
                        {nextLabel} ({next.isHome ? 'home' : 'away'}) · {formatDate(next.kickoff)}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Figure label="Chance to score" value={formatChance(next.pGoal)} why={why} />
                        <Figure label="Chance to assist" value={formatChance(next.pAssist)} why={why} />
                        <Figure label="Chance to start" value={formatChance(next.pStart)} why={why} />
                        <Figure
                            label="Expected minutes"
                            value={formatMinutes(next.expectedMinutes)}
                            why={why}
                        />
                        <Figure label="Expected points" value={formatPoints(next.expectedPoints)} why={why} />
                        <Figure label="Team win / draw / lose" value={outcomeText} why={why} wide />
                    </div>
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
