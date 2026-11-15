import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

import type { ForecastStatus } from '@/server/prediction/service/forecast.service.interface'

export function MethodView({ status }: { status: ForecastStatus }) {
    const e = status.evaluation

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
            <h1 className="font-heading text-3xl font-semibold">How we calculate</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
                For each player we estimate how many minutes they will play next gameweek, how often they
                score, assist, keep a clean sheet, collect cards or make defensive actions per 90 minutes
                (from their last matches, pulled toward the average of their position), and how hard the
                fixture is (the strength of both teams&apos; attack and defence, home or away). We then turn
                the expected numbers into points with the current Fantasy Premier League rules. Bonus points
                are not modelled separately: a small per-position correction, learned only from earlier
                gameweeks, absorbs them.
            </p>

            <Card>
                <CardHeader>
                    <CardTitle>How accurate is it?</CardTitle>
                    <CardDescription>
                        Every night we replay the finished gameweeks: for each one the forecast uses only what
                        was known before it, and is compared with the real FPL points.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {e ? (
                        <>
                            <p>
                                Checked on {e.eventsEvaluated} gameweeks and {e.playerEvents} player-gameweeks
                                (players expected to play at least 30 minutes).
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
                                appearances. Forecasts are shown only while the model beats the baseline on
                                both measures.{' '}
                                {status.enabled
                                    ? 'Right now it does, so forecasts are on.'
                                    : `Right now it does not (${e.reasons.join('; ') || 'not enough data'}), so forecasts are off.`}
                            </p>
                        </>
                    ) : (
                        <p className="text-muted-foreground">
                            The first accuracy check has not run yet, so forecasts are off. They will appear
                            once the model has been checked and beats the baseline.
                        </p>
                    )}
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
                Forecasts are informational and do not guarantee any result on a fantasy platform. Premier
                Fantasy is independent of the Premier League, Fantasy Premier League and UEFA.
            </p>
        </div>
    )
}
