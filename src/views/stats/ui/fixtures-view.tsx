import { Card, CardContent } from '@/shared/ui/card'
import { formatChance } from '@/shared/utils/format-chance'

import { FixtureHeatmap } from './fixture-heatmap'
import { formatDate } from './format'

import type { HeatmapMetric } from './heatmap-data'
import type { IStatsService } from '@/server/stats/service/stats.service.interface'

type Fixtures = Awaited<ReturnType<IStatsService['getFixtures']>>
type Heatmap = Awaited<ReturnType<IStatsService['getHeatmap']>>

export function FixturesView({
    data,
    heatmap,
    metric,
}: {
    data: Fixtures
    heatmap: Heatmap
    metric: HeatmapMetric
}) {
    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
            <h1 className="font-heading text-3xl font-semibold">
                {data.event ? `Gameweek ${data.event} fixtures` : 'Fixtures'}
            </h1>
            {data.fixtures.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming fixtures are scheduled right now.</p>
            ) : (
                <Card>
                    <CardContent className="divide-y pt-2">
                        {data.fixtures.map((f) => {
                            const p = f.probabilities

                            return (
                                <div key={f.id} className="space-y-1 py-3 text-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-muted-foreground">{formatDate(f.kickoff)}</span>
                                        <span className="font-medium">
                                            {f.home.name} v {f.away.name}
                                        </span>
                                    </div>
                                    {p && [p.pHome, p.pDraw, p.pAway].some((v) => v !== null) && (
                                        <p className="text-right text-xs text-muted-foreground tabular-nums">
                                            Home win {formatChance(p.pHome)} · Draw {formatChance(p.pDraw)} ·
                                            Away win {formatChance(p.pAway)}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}
            <FixtureHeatmap data={heatmap} metric={metric} />
        </div>
    )
}
