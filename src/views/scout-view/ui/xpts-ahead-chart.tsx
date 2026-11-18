'use client'

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartFrame, RowTooltip } from '@/widgets/player-stats'
import type { SwatchKind } from '@/widgets/player-stats'

import type { ScoutProfile } from '@/entities/scout'

import { ChartContainer } from '@/shared/ui/chart'
import type { ChartConfig } from '@/shared/ui/chart'

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']
const KINDS: SwatchKind[] = ['dashed', 'dash-dot', 'solid']
const DASH = ['4 3', '6 2 1.5 2', undefined]

interface AheadRow {
    horizon: number
    label: string
    opponents: (string | null)[]
    values: (number | null)[]
}

/** Expected points for each of the next matches of every player, lined up by "how many matches ahead". */
export function aheadRows(players: ScoutProfile[]): AheadRow[] {
    const furthest = Math.max(
        0,
        ...players.flatMap((p) => p.profile.probabilities?.matches.map((m) => m.horizon) ?? []),
    )
    const rows: AheadRow[] = Array.from({ length: furthest }, (_, i) => {
        const horizon = i + 1
        const found = players.map((p) => p.profile.probabilities?.matches.find((m) => m.horizon === horizon))

        return {
            horizon,
            label: horizon === 1 ? 'Next' : `+${horizon - 1}`,
            opponents: found.map((m) => m?.opponentName ?? null),
            values: found.map((m) => m?.expectedPoints ?? null),
        }
    }).filter((r) => r.values.some((v) => v !== null))

    return rows
}

export function XptsAheadChart({ players }: { players: ScoutProfile[] }) {
    const rows = aheadRows(players)

    if (rows.length === 0) return null

    const names = players.map((p) => p.profile.player.name)
    const data = rows.map((r) => ({
        label: r.label,
        ...Object.fromEntries(r.values.map((v, i) => [`s${i}`, v])),
    }))
    const config = Object.fromEntries(
        names.map((n, i) => [`s${i}`, { label: n, color: COLORS[i % COLORS.length] }]),
    ) satisfies ChartConfig

    return (
        <ChartFrame
            title="Who has the better run of matches?"
            question="Expected fantasy points in each of the next matches. A gap means the number is switched off or the player has no match there."
            legend={names.map((n, i) => ({
                label: `Forecast: ${n}`,
                kind: KINDS[i % KINDS.length],
                color: COLORS[i % COLORS.length],
            }))}
            table={{
                columns: ['Match', ...names],
                rows: rows.map((r) => [
                    r.label,
                    ...r.values.map((v, i) => (v === null ? '—' : `${v.toFixed(1)} (${r.opponents[i]})`)),
                ]),
            }}
        >
            <ChartContainer id="xpts-ahead" config={config} className="aspect-auto h-64 w-full">
                <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} />
                    <YAxis width={36} domain={[0, 'auto']} tickLine={false} axisLine={false} />
                    <Tooltip
                        content={(p) => {
                            const row: AheadRow | undefined = rows[Number(p.activeIndex)]

                            return (
                                <RowTooltip
                                    active={p.active}
                                    title={row?.label ?? null}
                                    lines={
                                        row
                                            ? names.map((n, i) => ({
                                                  label: n,
                                                  value:
                                                      row.values[i] === null
                                                          ? '—'
                                                          : `${row.values[i]?.toFixed(1)} vs ${row.opponents[i]}`,
                                              }))
                                            : []
                                    }
                                />
                            )
                        }}
                    />
                    {names.map((_, i) => (
                        <Line
                            key={i}
                            dataKey={`s${i}`}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={2}
                            strokeDasharray={DASH[i % DASH.length]}
                            dot={{ r: 3 }}
                            connectNulls={false}
                            isAnimationActive={false}
                        />
                    ))}
                </LineChart>
            </ChartContainer>
        </ChartFrame>
    )
}
