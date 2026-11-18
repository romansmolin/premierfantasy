'use client'

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart as Chart, Tooltip } from 'recharts'

import { ChartFrame, RowTooltip } from '@/widgets/player-stats'
import type { SwatchKind } from '@/widgets/player-stats'

import type { RadarProfile } from '@/entities/scout'

import { ChartContainer } from '@/shared/ui/chart'
import type { ChartConfig } from '@/shared/ui/chart'

export interface RadarSeries {
    name: string
    radar: RadarProfile
}

type Row = Record<string, number | string>

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']
const KINDS: SwatchKind[] = ['solid', 'dashed', 'dash-dot']
const DASH = [undefined, '6 4', '6 2 1.5 2']

/**
 * One row per axis, one value per series under the key `s<index>`. A series without enough data is left out;
 * an axis any remaining series has no percentile for is dropped and named in `skipped`; under three axes nothing is drawn.
 */
export function radarRows(series: RadarSeries[]): { rows: Row[]; skipped: string[] } {
    const active = series.flatMap((s, i) => (s.radar.lowData ? [] : [{ index: i, axes: s.radar.axes }]))

    if (active.length === 0) return { rows: [], skipped: [] }

    const rows: Row[] = []
    const skipped: string[] = []

    for (const axis of active[0].axes) {
        const values = active.map((s) => s.axes.find((a) => a.key === axis.key)?.percentile ?? null)

        if (values.some((v) => v === null)) {
            skipped.push(axis.label)

            continue
        }

        rows.push({
            axis: axis.label,
            ...Object.fromEntries(active.map((s, n) => [`s${s.index}`, values[n] as number])),
        })
    }

    return { rows: rows.length >= 3 ? rows : [], skipped }
}

export function RadarChart({ series }: { series: RadarSeries[] }) {
    const { rows, skipped } = radarRows(series)
    const notes = series.filter((s) => s.radar.lowData)
    const config = Object.fromEntries(
        series.map((s, i) => [`s${i}`, { label: s.name, color: COLORS[i % COLORS.length] }]),
    ) satisfies ChartConfig

    return (
        <div className="space-y-2">
            {rows.length > 0 && (
                <ChartFrame
                    title="Where does he stand among players of his position?"
                    question="Each spoke is a percentile against players of the same position with enough minutes: further out is better, 50 is a typical player."
                    legend={series.map((s, i) => ({
                        label: `Fact: ${s.name}`,
                        kind: KINDS[i % KINDS.length],
                        color: COLORS[i % COLORS.length],
                    }))}
                    table={{
                        columns: ['Axis', ...series.map((s) => s.name)],
                        rows: rows.map((r) => [
                            String(r.axis),
                            ...series.map((_, i) => (r[`s${i}`] === undefined ? '—' : String(r[`s${i}`]))),
                        ]),
                    }}
                >
                    <ChartContainer id="radar" config={config} className="aspect-auto h-80 w-full">
                        <Chart data={rows} outerRadius="68%">
                            <PolarGrid />
                            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                            <Tooltip
                                content={(p) => {
                                    const row: Row | undefined = rows[Number(p.activeIndex)]

                                    return (
                                        <RowTooltip
                                            active={p.active}
                                            title={row ? String(row.axis) : null}
                                            lines={
                                                row
                                                    ? series.flatMap((s, i) =>
                                                          row[`s${i}`] === undefined
                                                              ? []
                                                              : [
                                                                    {
                                                                        label: s.name,
                                                                        value: `${row[`s${i}`]}th percentile`,
                                                                    },
                                                                ],
                                                      )
                                                    : []
                                            }
                                        />
                                    )
                                }}
                            />
                            {series.map((s, i) =>
                                s.radar.lowData ? null : (
                                    <Radar
                                        key={i}
                                        dataKey={`s${i}`}
                                        stroke={COLORS[i % COLORS.length]}
                                        fill={COLORS[i % COLORS.length]}
                                        fillOpacity={0.15}
                                        strokeWidth={2}
                                        strokeDasharray={DASH[i % DASH.length]}
                                        isAnimationActive={false}
                                    />
                                ),
                            )}
                        </Chart>
                    </ChartContainer>
                </ChartFrame>
            )}
            {rows.length === 0 && notes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Not enough data to rank these players: too few of the radar numbers are available.
                </p>
            )}
            {notes.map((s, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                    {s.name}: {s.radar.reason}
                </p>
            ))}
            {skipped.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    Hidden, no data for every player: {skipped.join(', ')}.
                </p>
            )}
        </div>
    )
}
