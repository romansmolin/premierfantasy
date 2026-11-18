'use client'

import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts'

import { Button } from '@/shared/ui/button'
import { ChartContainer } from '@/shared/ui/chart'
import type { ChartConfig } from '@/shared/ui/chart'

import { formSeries } from './chart-data'
import { AngledTick, ChartFrame, RowTooltip } from './chart-frame'

import type { FormPeriod } from './chart-data'
import type { FormMatch } from '@/server/stats/service/stats.service.interface'

const config = {
    goals: { label: 'Goals', color: 'var(--chart-1)' },
    assists: { label: 'Assists', color: 'var(--chart-2)' },
    xg: { label: 'xG', color: 'var(--chart-1)' },
    xa: { label: 'xA', color: 'var(--chart-2)' },
} satisfies ChartConfig

const PERIODS: FormPeriod[] = [5, 10]

const num = (v: number | null, empty: string) => (v === null ? empty : v.toFixed(2))

export function FormChart({ matches }: { matches: FormMatch[] }) {
    const [period, setPeriod] = useState<FormPeriod>(10)
    const rows = formSeries(matches, period)

    return (
        <ChartFrame
            title="How many goals and assists has he produced lately?"
            question="Solid bars are what happened; dashed lines are the chances behind it (xG, xA), so a line above a bar means unlucky."
            legend={[
                { label: 'Fact: goals', kind: 'solid', color: 'var(--chart-1)' },
                { label: 'Fact: assists', kind: 'solid', color: 'var(--chart-2)' },
                { label: 'xG (expected goals)', kind: 'dashed', color: 'var(--chart-1)' },
                { label: 'xA (expected assists)', kind: 'dash-dot', color: 'var(--chart-2)' },
            ]}
            table={{
                columns: ['Match', 'Goals', 'xG', 'Assists', 'xA'],
                rows: rows.map((r) => [
                    r.label,
                    String(r.goals),
                    num(r.xg, 'no xG data'),
                    String(r.assists),
                    num(r.xa, 'no xA data'),
                ]),
            }}
            actions={
                <div className="flex gap-1" role="group" aria-label="Number of matches">
                    {PERIODS.map((p) => (
                        <Button
                            key={p}
                            type="button"
                            size="sm"
                            variant={period === p ? 'default' : 'outline'}
                            aria-pressed={period === p}
                            onClick={() => setPeriod(p)}
                        >
                            Last {p}
                        </Button>
                    ))}
                </div>
            }
        >
            <ChartContainer id="form" config={config} className="aspect-auto h-72 w-full">
                <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="label"
                        interval={0}
                        height={76}
                        tick={<AngledTick />}
                        tickLine={false}
                        label={{
                            value: 'Match',
                            position: 'insideBottom',
                            offset: 4,
                            className: 'fill-muted-foreground text-[10px]',
                        }}
                    />
                    <YAxis
                        allowDecimals={false}
                        width={44}
                        tickLine={false}
                        axisLine={false}
                        label={{
                            value: 'Goals per match',
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
                                    title={row?.label ?? null}
                                    lines={
                                        row
                                            ? [
                                                  { label: 'Goals', value: String(row.goals) },
                                                  { label: 'xG', value: num(row.xg, 'no xG data') },
                                                  { label: 'Assists', value: String(row.assists) },
                                                  { label: 'xA', value: num(row.xa, 'no xA data') },
                                              ]
                                            : []
                                    }
                                />
                            )
                        }}
                    />
                    <Bar
                        dataKey="goals"
                        fill="var(--color-goals)"
                        radius={2}
                        maxBarSize={14}
                        isAnimationActive={false}
                    />
                    <Bar
                        dataKey="assists"
                        fill="var(--color-assists)"
                        radius={2}
                        maxBarSize={14}
                        isAnimationActive={false}
                    />
                    <Line
                        dataKey="xg"
                        stroke="var(--color-xg)"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        dot={{ r: 3, fill: 'var(--color-xg)' }}
                        connectNulls={false}
                        isAnimationActive={false}
                    />
                    <Line
                        dataKey="xa"
                        stroke="var(--color-xa)"
                        strokeWidth={2}
                        strokeDasharray="6 2 1.5 2"
                        dot={{ r: 3, fill: 'var(--color-xa)' }}
                        connectNulls={false}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ChartContainer>
        </ChartFrame>
    )
}
