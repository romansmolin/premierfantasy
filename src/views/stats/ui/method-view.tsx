import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatChance } from '@/shared/utils/format-chance'

import { formatDate } from './format'
import { calibrationRows, groupGates } from './method-data'

import type { MethodParams } from './method-data'
import type { GateResult, Metric } from '@/server/prediction/lib/v2/evaluation'
import type { ForecastStatus } from '@/server/prediction/service/forecast.service.interface'
import type { ProbabilityStatus } from '@/server/prediction/service/probability.service.interface'

const METRIC_LABEL: Record<Metric, string> = {
    goal: 'Goal (1 or more)',
    assist: 'Assist (1 or more)',
    start: 'Starts the match',
    points: 'Points distribution',
    outcome: 'Match result (win / draw / loss)',
}

const BASELINE: Record<Metric, string> = {
    goal: 'the share of matches in which the player scored, over his last 10 matches',
    assist: 'the share of matches in which the player assisted, over his last 10 matches',
    start: 'the share of matches the player started, over his last 10 matches',
    points: "the player's own points distribution (0–2, 3–5, 6–9, 10+) over his last 10 matches",
    outcome: 'the league-wide frequencies of home win, draw and away win',
}

const brier = (x: number) => x.toFixed(4)

const horizonLabel = (h: GateResult['horizon'], matches: number) =>
    h === 'next' ? 'Next match' : `Matches 2–${matches}`

const when = (d: Date | string | null) => (d ? formatDate(d) : 'not yet')

const H2 = 'font-heading text-xl font-semibold'
const P = 'text-sm leading-relaxed text-muted-foreground'

export function MethodView({
    status,
    probability,
    params,
}: {
    status: ForecastStatus
    probability: ProbabilityStatus
    params: MethodParams
}) {
    const e = status.evaluation
    const groups = groupGates(probability.gates)
    const evaluated = probability.evaluatedAt !== null && groups.length > 0
    const g = params.gate
    const parameters: [string, string, string][] = [
        [
            'xgWeight',
            String(params.xgWeight),
            'Weight of FPL xG/xA against real goals and assists in a scoring rate.',
        ],
        [
            'decay',
            String(params.decay),
            'Per-match weight decay of recent form: the older the match, the less it counts.',
        ],
        ['minutesDecay', String(params.minutesDecay), 'The same decay applied to minutes and starts.'],
        [
            'priorMinutes90',
            String(params.priorMinutes90),
            'Minutes of the position average mixed into every rate, so a short sample cannot swing it.',
        ],
        [
            'sims',
            String(params.sims),
            'Simulated matches per player and fixture for the points distribution.',
        ],
        [
            'horizon',
            `${params.horizonMatches} matches`,
            "The player's next matches, not gameweeks: a double gameweek gives two.",
        ],
        [
            'minimum appearances',
            String(params.minAppearances),
            'Players with fewer appearances get no forecast.',
        ],
    ]

    return (
        <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10">
            <h1 className="font-heading text-3xl font-semibold">How we calculate</h1>

            <section className="space-y-3">
                <h2 className={H2}>Probabilities for the next {params.horizonMatches} matches</h2>
                <p className={P}>
                    For every player we estimate the chance to score, to assist and to start, the number of
                    points he is likely to get, and for every fixture the chance of a home win, a draw and an
                    away win. These are forecasts. Facts (goals, minutes, xG, points already scored) are shown
                    separately and are never mixed into a forecast.
                </p>
                <p className={P}>
                    Inputs: the player&apos;s recent form, with newer matches counting more, where goals and
                    assists are blended with the xG and xA that Fantasy Premier League records at weight{' '}
                    {params.xgWeight}; expected minutes and the chance to start (including injury status); the
                    strength of both teams&apos; attack and defence; and home or away. The chances come from
                    Poisson counts of those events. The points distribution comes from simulating the match{' '}
                    {params.sims} times with the Fantasy Premier League scoring rules.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className={H2}>Parameters</h2>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Parameter</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="min-w-64">Meaning</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parameters.map(([name, value, text]) => (
                            <TableRow key={name}>
                                <TableCell className="font-mono">{name}</TableCell>
                                <TableCell className="text-right tabular-nums">{value}</TableCell>
                                <TableCell className="whitespace-normal text-muted-foreground">
                                    {text}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </section>

            <section className="space-y-3">
                <h2 className={H2}>When a probability is shown</h2>
                <p className={P}>
                    Every night the model replays the finished gameweeks, forecasting each one only from what
                    was known before it. A metric is shown for a horizon and a position only when all of this
                    holds: at least {g.minEvents} gameweeks were checked; at least {g.minRecords} records
                    exist; the model&apos;s Brier score beats the baseline by at least {g.minBrierEdge}; and
                    no calibration bucket with at least {g.minBucketN} records is off by more than{' '}
                    {formatChance(g.maxBucketGap)} points. The Brier score is the mean squared error of the
                    probabilities, so lower is better. Otherwise the number is hidden with a dash.
                </p>
                {evaluated ? (
                    <div className="space-y-5">
                        <p className={P}>
                            Checked on {probability.eventsEvaluated} gameweeks. Last check:{' '}
                            {when(probability.evaluatedAt)}.
                        </p>
                        {groups.map((group) => (
                            <div key={group.metric} className="space-y-2">
                                <h3 className="text-sm font-medium">{METRIC_LABEL[group.metric]}</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Horizon</TableHead>
                                            <TableHead>Position</TableHead>
                                            <TableHead className="text-right">Records</TableHead>
                                            <TableHead className="text-right">Brier, model</TableHead>
                                            <TableHead className="text-right">Brier, baseline</TableHead>
                                            <TableHead className="min-w-56">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.rows.map((r) => (
                                            <TableRow key={`${r.horizon}-${r.position}`}>
                                                <TableCell>
                                                    {horizonLabel(r.horizon, params.horizonMatches)}
                                                </TableCell>
                                                <TableCell>
                                                    {r.position === 'ALL' ? 'All' : r.position}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {r.n}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {brier(r.brier)}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {brier(r.baselineBrier)}
                                                </TableCell>
                                                <TableCell className="whitespace-normal">
                                                    <Badge variant={r.passed ? 'secondary' : 'outline'}>
                                                        {r.passed ? 'On' : 'Off'}
                                                    </Badge>
                                                    {!r.passed && r.reasons.length > 0 && (
                                                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                                                            {r.reasons.map((reason) => (
                                                                <li key={reason}>{reason}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        The first accuracy check has not run yet, so probabilities are off.
                    </p>
                )}
            </section>

            <section className="space-y-3">
                <h2 className={H2}>Calibration</h2>
                <p className={P}>
                    A probability is honest when it matches reality: when we say 40%, it should happen about
                    40% of the time. For every metric that is on, the table compares what we predicted with
                    what happened, in 10-point buckets.
                </p>
                {groups.map((group) => {
                    const on = probability.gates
                        .filter((x) => x.metric === group.metric && x.passed)
                        .map((x) => ({ gate: x, rows: calibrationRows(x.buckets) }))

                    if (on.length === 0) return null

                    return (
                        <details key={group.metric} className="rounded-lg border px-4 py-3 text-sm">
                            <summary className="cursor-pointer font-medium">
                                {METRIC_LABEL[group.metric]}
                            </summary>
                            <div className="mt-3 space-y-4">
                                {on.map(({ gate, rows }) => {
                                    const example = rows.find((r) => r.range === '40–50%')

                                    return (
                                        <div key={`${gate.horizon}-${gate.position}`} className="space-y-2">
                                            <h4 className="font-medium">
                                                {horizonLabel(gate.horizon, params.horizonMatches)},{' '}
                                                {gate.position === 'ALL' ? 'all positions' : gate.position}
                                            </h4>
                                            {rows.length === 0 ? (
                                                <p className="text-muted-foreground">
                                                    No calibration data stored.
                                                </p>
                                            ) : (
                                                <>
                                                    {example && (
                                                        <p className="text-muted-foreground">
                                                            When we say {example.predicted}, it happened{' '}
                                                            {example.observed} of the time.
                                                        </p>
                                                    )}
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Bucket</TableHead>
                                                                <TableHead className="text-right">
                                                                    Predicted
                                                                </TableHead>
                                                                <TableHead className="text-right">
                                                                    Observed
                                                                </TableHead>
                                                                <TableHead className="text-right">
                                                                    n
                                                                </TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {rows.map((r) => (
                                                                <TableRow key={r.range}>
                                                                    <TableCell>{r.range}</TableCell>
                                                                    <TableCell className="text-right tabular-nums">
                                                                        {r.predicted}
                                                                    </TableCell>
                                                                    <TableCell className="text-right tabular-nums">
                                                                        {r.observed}
                                                                    </TableCell>
                                                                    <TableCell className="text-right tabular-nums">
                                                                        {r.n}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </details>
                    )
                })}
                {!groups.some((x) => probability.gates.some((gt) => gt.metric === x.metric && gt.passed)) && (
                    <p className="text-sm text-muted-foreground">
                        No metric is on yet, so there is no calibration to show.
                    </p>
                )}
            </section>

            <section className="space-y-3">
                <h2 className={H2}>Baselines, data and updates</h2>
                <p className={P}>The simple rules each metric has to beat:</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {(Object.keys(BASELINE) as Metric[]).map((m) => (
                        <li key={m}>
                            <strong className="font-medium text-foreground">{METRIC_LABEL[m]}:</strong>{' '}
                            {BASELINE[m]}.
                        </li>
                    ))}
                    <li>
                        <strong className="font-medium text-foreground">
                            Expected points (v1 against v2):
                        </strong>{' '}
                        the v1 points forecast, compared on exactly the same records.
                    </li>
                </ul>
                <p className={P}>
                    Points: v2 replaces v1 for expected points only if it passes the points check and is no
                    worse than v1 on average error and player ranking over the same gameweeks
                    {probability.pointsMeanOn
                        ? '. Right now it is, so v2 expected points are used.'
                        : '. Right now it is not, so expected points stay on v1 and everything that only v2 provides about points (the points distribution, expected points for matches 2–' +
                          params.horizonMatches +
                          ') is hidden, so two different numbers never sit side by side.'}
                </p>
                <p className={P}>
                    Data: match statistics from API-Football; xG, xA, starts, points and injury status from
                    the Fantasy Premier League API. We use no bookmaker odds. Last accuracy check:{' '}
                    {when(probability.evaluatedAt)}. Probabilities last stored: {when(probability.updatedAt)}.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className={H2}>Expected points forecast</h2>
                <p className={P}>
                    For each player we estimate how many minutes they will play next gameweek, how often they
                    score, assist, keep a clean sheet, collect cards or make defensive actions per 90 minutes
                    (from their last matches, pulled toward the average of their position), and how hard the
                    fixture is (the strength of both teams&apos; attack and defence, home or away). We then
                    turn the expected numbers into points with the current Fantasy Premier League rules. Bonus
                    points are not modelled separately: a small per-position correction, learned only from
                    earlier gameweeks, absorbs them.
                </p>

                <Card>
                    <CardHeader>
                        <CardTitle>How accurate is it?</CardTitle>
                        <CardDescription>
                            Every night we replay the finished gameweeks: for each one the forecast uses only
                            what was known before it, and is compared with the real FPL points.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        {e ? (
                            <>
                                <p>
                                    Checked on {e.eventsEvaluated} gameweeks and {e.playerEvents}{' '}
                                    player-gameweeks (players expected to play at least 30 minutes).
                                </p>
                                <ul className="space-y-1">
                                    <li>
                                        Average error: <strong>{e.mae.toFixed(2)}</strong> points (simple
                                        baseline: {e.baselineMae.toFixed(2)})
                                    </li>
                                    <li>
                                        Ranking of players within a position:{' '}
                                        <strong>{e.rankCorr.toFixed(2)}</strong> (baseline:{' '}
                                        {e.baselineRankCorr.toFixed(2)})
                                    </li>
                                </ul>
                                <p className="text-muted-foreground">
                                    The baseline is the player&apos;s average points over their last 5
                                    appearances. Forecasts are shown only while the model beats the baseline
                                    on both measures.{' '}
                                    {status.enabled
                                        ? 'Right now it does, so forecasts are on.'
                                        : `Right now it does not (${e.reasons.join('; ') || 'not enough data'}), so forecasts are off.`}
                                </p>
                            </>
                        ) : (
                            <p className="text-muted-foreground">
                                The first accuracy check has not run yet, so forecasts are off. They will
                                appear once the model has been checked and beats the baseline.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </section>

            <p className="text-xs text-muted-foreground">
                Forecasts are informational and do not guarantee any result on a fantasy platform. They are
                not betting advice. Premier Fantasy is independent of the Premier League, Fantasy Premier
                League and UEFA.
            </p>
        </div>
    )
}
