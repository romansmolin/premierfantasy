'use client'

import { Bar, CartesianGrid, ComposedChart, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartFrame, RowTooltip } from '@/widgets/player-stats'

import type { ScoutProfile } from '@/entities/scout'

import { ChartContainer } from '@/shared/ui/chart'
import type { ChartConfig } from '@/shared/ui/chart'

const config = { fact: { label: 'Fact', color: 'var(--chart-1)' } } satisfies ChartConfig

const num = (v: number | null) => (v === null ? 'no data' : v.toFixed(1))

export function ValueAndXgChart({ data }: { data: ScoutProfile }) {
    const { totals } = data.profile
    const rows = [
        { label: 'Goals', fact: totals.goals, expected: data.season.xg },
        { label: 'Assists', fact: totals.assists, expected: data.season.xa },
    ]

    return (
        <ChartFrame
            title="Is he lucky or genuinely dangerous?"
            question="Solid bars are goals and assists this season; outlined bars are the chances behind them (xG, xA). An outline above the bar means he is due more."
            legend={[
                { label: 'Fact: scored / assisted', kind: 'solid', color: 'var(--chart-1)' },
                { label: 'xG / xA (expected)', kind: 'outline', color: 'var(--chart-1)' },
            ]}
            table={{
                columns: ['Measure', 'Fact', 'Expected'],
                rows: rows.map((r) => [r.label, String(r.fact), num(r.expected)]),
            }}
        >
            <ChartContainer id="xg" config={config} className="aspect-auto h-56 w-full">
                <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} />
                    <YAxis width={32} allowDecimals={false} tickLine={false} axisLine={false} />
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
                                                  { label: 'Fact', value: String(row.fact) },
                                                  { label: 'Expected', value: num(row.expected) },
                                              ]
                                            : []
                                    }
                                />
                            )
                        }}
                    />
                    <Bar dataKey="fact" fill="var(--chart-1)" maxBarSize={36} isAnimationActive={false} />
                    <Bar
                        dataKey="expected"
                        fill="none"
                        stroke="var(--chart-1)"
                        strokeWidth={1.5}
                        maxBarSize={36}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ChartContainer>
        </ChartFrame>
    )
}
