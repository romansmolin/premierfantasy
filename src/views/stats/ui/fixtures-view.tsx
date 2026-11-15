import { Card, CardContent } from '@/shared/ui/card'

import { formatDate } from './format'

import type { IStatsService } from '@/server/stats/service/stats.service.interface'

type Fixtures = Awaited<ReturnType<IStatsService['getFixtures']>>

export function FixturesView({ data }: { data: Fixtures }) {
    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
            <h1 className="font-heading text-3xl font-semibold">
                {data.event ? `Gameweek ${data.event} fixtures` : 'Fixtures'}
            </h1>
            {data.fixtures.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming fixtures are scheduled right now.</p>
            ) : (
                <Card>
                    <CardContent className="divide-y pt-2">
                        {data.fixtures.map((f) => (
                            <div key={f.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                                <span className="text-muted-foreground">{formatDate(f.kickoff)}</span>
                                <span className="font-medium">
                                    {f.home.name} v {f.away.name}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
