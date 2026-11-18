import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

import type { ReactNode } from 'react'

export type SwatchKind = 'solid' | 'hatch' | 'outline' | 'dashed' | 'dash-dot'

/** Small legend glyph whose shape, not only its colour, carries the meaning. */
export function Swatch({ kind, color }: { kind: SwatchKind; color: string }) {
    return (
        <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true" className="shrink-0">
            {kind === 'solid' && <rect x="1" y="1" width="20" height="10" rx="1" fill={color} />}
            {kind === 'hatch' && (
                <>
                    <rect
                        x="1"
                        y="1"
                        width="20"
                        height="10"
                        rx="1"
                        fill={color}
                        fillOpacity="0.2"
                        stroke={color}
                        strokeDasharray="3 2"
                    />
                    <path d="M4 11 L10 1 M10 11 L16 1 M16 11 L22 1" stroke={color} strokeWidth="1.5" />
                </>
            )}
            {kind === 'outline' && (
                <rect
                    x="1"
                    y="1"
                    width="20"
                    height="10"
                    rx="1"
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                />
            )}
            {kind === 'dashed' && (
                <line x1="0" y1="6" x2="22" y2="6" stroke={color} strokeWidth="2" strokeDasharray="4 3" />
            )}
            {kind === 'dash-dot' && (
                <line
                    x1="0"
                    y1="6"
                    x2="22"
                    y2="6"
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray="6 2 1.5 2"
                />
            )}
        </svg>
    )
}

export interface TableData {
    columns: string[]
    rows: string[][]
}

interface ChartFrameProps {
    title: string
    question: string
    legend: { label: string; kind: SwatchKind; color: string }[]
    table: TableData
    actions?: ReactNode
    children: ReactNode
}

/** Titled card: the question the chart answers, a legend, the chart and a screen-reader data table. */
export function ChartFrame({ title, question, legend, table, actions, children }: ChartFrameProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-sm">{title}</CardTitle>
                    {actions}
                </div>
                <CardDescription>{question}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {legend.map((item) => (
                        <li key={item.label} className="flex items-center gap-1.5">
                            <Swatch kind={item.kind} color={item.color} />
                            {item.label}
                        </li>
                    ))}
                </ul>
                <div role="img" aria-label={`${title}. ${question} The data is in the table below.`}>
                    {children}
                </div>
                {/* The wrapper clips: an absolutely positioned table ignores overflow and widens the page on phones. */}
                <div className="sr-only">
                    <table>
                        <caption>{title}</caption>
                        <thead>
                            <tr>
                                {table.columns.map((column) => (
                                    <th key={column} scope="col">
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {table.rows.map((row, i) => (
                                <tr key={i}>
                                    {row.map((cell, j) => (
                                        <td key={j}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}

/** Tooltip body built from the hovered row, so a null value still shows its "—" line. */
export function RowTooltip({
    active,
    title,
    lines,
}: {
    active?: boolean
    title: string | null
    lines: { label: string; value: string }[]
}) {
    if (!active || title === null) return null

    return (
        <div className="grid min-w-32 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <div className="font-medium">{title}</div>
            {lines.map((line) => (
                <div key={line.label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{line.label}</span>
                    <span className="font-mono font-medium tabular-nums">{line.value}</span>
                </div>
            ))}
        </div>
    )
}

/** SVG hatch fill for forecast bars; `id` must be unique per chart. */
export function HatchPattern({ id, color }: { id: string; color: string }) {
    return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={color} fillOpacity="0.2" />
            <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="2.5" />
        </pattern>
    )
}

/** Long club names ("Manchester United") would clip when rotated: shorten the name, keep the "vs/at" and "(H)/(A)" marks. */
const shortenTick = (label: string): string =>
    label.replace(
        /^(vs |at )(.{9,}?)( \([HA]\))$/,
        (_, lead: string, name: string, tail: string) => `${lead}${name.slice(0, 7)}…${tail}`,
    )

/** Rotated compact category tick that fits 10 matches at 375px. */
export function AngledTick({
    x,
    y,
    payload,
}: {
    x?: number | string
    y?: number | string
    payload?: { value: string }
}) {
    return (
        <text
            x={Number(x)}
            y={Number(y) + 4}
            textAnchor="end"
            transform={`rotate(-40 ${Number(x)} ${Number(y)})`}
            className="fill-muted-foreground text-[10px]"
        >
            {payload ? shortenTick(payload.value) : null}
        </text>
    )
}

/** Y-axis range for a percent chart: top is a multiple of 20 above the data, with 4 even steps. */
export function percentAxis(values: (number | null)[]): { domain: [number, number]; ticks: number[] } {
    const max = Math.max(0, ...values.filter((v): v is number => v !== null))
    const top = Math.min(100, Math.max(20, Math.ceil((max + 5) / 20) * 20))

    return { domain: [0, top], ticks: [0, 1, 2, 3, 4].map((i) => (top / 4) * i) }
}
