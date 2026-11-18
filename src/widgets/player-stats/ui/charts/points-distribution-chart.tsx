'use client'

import { useId } from 'react'
import { Bar, CartesianGrid, ComposedChart, LabelList, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer } from '@/shared/ui/chart'
import type { ChartConfig } from '@/shared/ui/chart'
import { formatChance } from '@/shared/utils/format-chance'

import { ChartFrame, HatchPattern, RowTooltip, percentAxis } from './chart-frame'

import type { bucketBars } from './chart-data'

const config = { pct: { label: 'Share of simulations', color: 'var(--chart-2)' } } satisfies ChartConfig

/** `bars` come from `bucketBars` for one upcoming match; null (hidden) shows a note instead of zero bars. */
export function PointsDistributionChart({
    bars,
    matchLabel,
}: {
    bars: ReturnType<typeof bucketBars>
    matchLabel: string
}) {
    const patternId = `hatch-${useId().replace(/:/g, '')}`
    const rows = (bars ?? []).map((b) => ({ ...b, pct: b.share * 100 }))

    const axis = percentAxis(rows.map((r) => r.pct))

    return (
        <ChartFrame
            title={`How many fantasy points could he score ${matchLabel}?`}
            question="Hatched bars are forecasts: the share of simulated matches ending in each points range."
            legend={[{ label: 'Forecast: share of simulations', kind: 'hatch', color: 'var(--chart-2)' }]}
            table={{
                columns: ['Points', 'Share of simulations'],
                rows:
                    bars === null ? [['all ranges', '—']] : bars.map((b) => [b.label, formatChance(b.share)]),
            }}
        >
            {bars === null ? (
                <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    — The points forecast is hidden for this match.
                </p>
            ) : (
                <ChartContainer id="points" config={config} className="aspect-auto h-64 w-full">
                    <ComposedChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                        <defs>
                            <HatchPattern id={patternId} color="var(--chart-2)" />
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            label={{
                                value: 'Fantasy points in the match',
                                position: 'insideBottom',
                                offset: 4,
                                className: 'fill-muted-foreground text-[10px]',
                            }}
                            height={44}
                        />
                        <YAxis
                            width={44}
                            domain={axis.domain}
                            ticks={axis.ticks}
                            tickLine={false}
                            axisLine={false}
                            label={{
                                value: 'Share of simulations, %',
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
                                        title={row ? `${row.label} points` : null}
                                        lines={
                                            row
                                                ? [
                                                      {
                                                          label: 'Share of simulations',
                                                          value: formatChance(row.share),
                                                      },
                                                  ]
                                                : []
                                        }
                                    />
                                )
                            }}
                        />
                        <Bar
                            dataKey="pct"
                            fill={`url(#${patternId})`}
                            stroke="var(--chart-2)"
                            strokeWidth={1.5}
                            strokeDasharray="4 2"
                            radius={2}
                            maxBarSize={56}
                            isAnimationActive={false}
                        >
                            <LabelList
                                dataKey="pct"
                                position="top"
                                className="fill-foreground text-[10px]"
                                formatter={(v: unknown) =>
                                    typeof v === 'number' ? formatChance(v / 100) : ''
                                }
                            />
                        </Bar>
                    </ComposedChart>
                </ChartContainer>
            )}
        </ChartFrame>
    )
}
