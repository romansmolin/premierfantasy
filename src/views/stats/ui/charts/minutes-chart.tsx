'use client'

import { useId } from 'react'
import { Bar, CartesianGrid, ComposedChart, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer } from '@/shared/ui/chart'
import type { ChartConfig } from '@/shared/ui/chart'

import { minutesSeries } from './chart-data'
import { AngledTick, ChartFrame, HatchPattern, RowTooltip } from './chart-frame'

import type { FormMatch } from '@/server/stats/service/stats.service.interface'

type Row = ReturnType<typeof minutesSeries>[number]

const config = { minutes: { label: 'Minutes', color: 'var(--chart-4)' } } satisfies ChartConfig

const ROLE_LABEL: Record<Row['role'], string> = {
    start: 'Started',
    sub: 'Came off the bench',
    unused: 'Did not play',
}

interface BarShapeProps {
    x?: number
    y?: number
    width?: number
    height?: number
    payload?: Row
}

export function MinutesChart({ matches }: { matches: FormMatch[] }) {
    const patternId = `hatch-${useId().replace(/:/g, '')}`
    const rows = minutesSeries(matches)

    // start = filled, sub = hatched, unused = outline stub (a 0-minute bar would be invisible).
    const shape = ({ x = 0, y = 0, width = 0, height = 0, payload }: BarShapeProps) => {
        const color = 'var(--chart-4)'

        if (payload?.role === 'unused') {
            return (
                <rect
                    x={x}
                    y={y - 6}
                    width={width}
                    height={6}
                    rx={1}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                />
            )
        }

        if (payload?.role === 'sub') {
            return (
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={1}
                    fill={`url(#${patternId})`}
                    stroke={color}
                    strokeWidth={1.5}
                />
            )
        }

        return <rect x={x} y={y} width={width} height={height} rx={1} fill={color} />
    }

    return (
        <ChartFrame
            title="Does he play the full match?"
            question="Minutes played in each recent match: filled = started, hatched = came off the bench, small outline = did not play."
            legend={[
                { label: 'Fact: started', kind: 'solid', color: 'var(--chart-4)' },
                { label: 'Fact: came off the bench', kind: 'hatch', color: 'var(--chart-4)' },
                { label: 'Fact: did not play', kind: 'outline', color: 'var(--chart-4)' },
            ]}
            table={{
                columns: ['Match', 'Role', 'Minutes'],
                rows: rows.map((r) => [r.label, ROLE_LABEL[r.role], String(r.minutes)]),
            }}
        >
            <ChartContainer id="minutes" config={config} className="aspect-auto h-72 w-full">
                <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                        <HatchPattern id={patternId} color="var(--chart-4)" />
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="label"
                        interval={0}
                        height={64}
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
                        width={44}
                        domain={[0, 90]}
                        ticks={[0, 30, 60, 90]}
                        tickLine={false}
                        axisLine={false}
                        label={{
                            value: 'Minutes',
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
                                                  { label: 'Role', value: ROLE_LABEL[row.role] },
                                                  { label: 'Minutes', value: String(row.minutes) },
                                              ]
                                            : []
                                    }
                                />
                            )
                        }}
                    />
                    <Bar dataKey="minutes" shape={shape} maxBarSize={22} isAnimationActive={false} />
                </ComposedChart>
            </ChartContainer>
        </ChartFrame>
    )
}
