'use client'

import { useId } from 'react'
import { Bar, CartesianGrid, ComposedChart, LabelList, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer } from '@/shared/ui/chart'
import type { ChartConfig } from '@/shared/ui/chart'
import { formatChance } from '@/shared/utils/format-chance'

import { goalOutlookSeries } from './chart-data'
import { AngledTick, ChartFrame, HatchPattern, RowTooltip, percentAxis } from './chart-frame'

import type { PlayerProbabilityCard } from '@/server/stats/service/stats.service.interface'

const config = { pct: { label: 'Chance to score', color: 'var(--chart-1)' } } satisfies ChartConfig

export function GoalOutlookChart({ matches }: { matches: PlayerProbabilityCard['matches'] }) {
    const patternId = `hatch-${useId().replace(/:/g, '')}`
    const series = goalOutlookSeries(matches)
    // A hidden chance stays null so the bar is a gap, never a 0% bar; the zero-height `hit` series keeps the tooltip alive over a gap.
    const rows = series.map((r) => ({ ...r, pct: r.pGoal === null ? null : r.pGoal * 100, hit: 0 }))

    const axis = percentAxis(rows.map((r) => r.pct))

    return (
        <ChartFrame
            title="How likely is he to score in each of his next matches?"
            question="Hatched bars are forecasts; a gap means the chance is hidden or unknown."
            legend={[{ label: 'Forecast: chance to score', kind: 'hatch', color: 'var(--chart-1)' }]}
            table={{
                columns: ['Next match', 'Match', 'Chance to score'],
                rows: rows.map((r) => [String(r.horizon), r.label, formatChance(r.pGoal)]),
            }}
        >
            <ChartContainer id="goal-outlook" config={config} className="aspect-auto h-64 w-full">
                <ComposedChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                        <HatchPattern id={patternId} color="var(--chart-1)" />
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="label"
                        interval={0}
                        height={76}
                        tick={<AngledTick />}
                        tickLine={false}
                        label={{
                            value: 'Next matches',
                            position: 'insideBottom',
                            offset: 4,
                            className: 'fill-muted-foreground text-[10px]',
                        }}
                    />
                    <YAxis
                        width={44}
                        domain={axis.domain}
                        ticks={axis.ticks}
                        tickFormatter={(v: number) => `${v}`}
                        tickLine={false}
                        axisLine={false}
                        label={{
                            value: 'Probability, %',
                            angle: -90,
                            position: 'insideLeft',
                            className: 'fill-muted-foreground text-[10px]',
                        }}
                    />
                    <Tooltip
                        content={(p) => {
                            const row: (typeof rows)[number] | undefined = rows[Number(p.activeIndex)]

                            return (
                                <RowTooltip
                                    active={p.active}
                                    title={row ? `Next match ${row.horizon}: ${row.label}` : null}
                                    lines={
                                        row
                                            ? [{ label: 'Chance to score', value: formatChance(row.pGoal) }]
                                            : []
                                    }
                                />
                            )
                        }}
                    />
                    <Bar dataKey="hit" stackId="s" fill="transparent" isAnimationActive={false} />
                    <Bar
                        stackId="s"
                        dataKey="pct"
                        fill={`url(#${patternId})`}
                        stroke="var(--chart-1)"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        radius={2}
                        maxBarSize={36}
                        isAnimationActive={false}
                    >
                        <LabelList
                            dataKey="pct"
                            position="top"
                            className="fill-foreground text-[10px]"
                            formatter={(v: unknown) => (typeof v === 'number' ? formatChance(v / 100) : '')}
                        />
                    </Bar>
                </ComposedChart>
            </ChartContainer>
        </ChartFrame>
    )
}
