import { bestIndexes } from '@/entities/scout'
import type { ScoutProfile } from '@/entities/scout'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatChance } from '@/shared/utils/format-chance'
import { formatPoints, formatPrice } from '@/shared/utils/format-stats'

type CellFormat = 'price' | 'points' | 'ratio' | 'int' | 'chance'

export interface CompareRow {
    key: string
    label: string
    values: (number | null)[]
    /** Indexes of the best value; empty when nothing should be highlighted. */
    best: number[]
    format: CellFormat
}

const nextMatch = (p: ScoutProfile) => p.profile.probabilities?.matches.find((m) => m.horizon === 1)

interface Spec {
    key: string
    label: string
    format: CellFormat
    /** null: the figure has no better side, so nothing is highlighted. */
    higherIsBetter: boolean | null
    get: (p: ScoutProfile) => number | null
}

const SPECS: Spec[] = [
    {
        key: 'price',
        label: 'Price',
        format: 'price',
        higherIsBetter: null,
        get: (p) => p.profile.player.price,
    },
    {
        key: 'form',
        label: 'Form (last 5)',
        format: 'points',
        higherIsBetter: true,
        get: (p) => p.profile.form,
    },
    {
        key: 'value',
        label: 'Points per £m',
        format: 'ratio',
        higherIsBetter: true,
        get: (p) => p.value.pointsPerMillion,
    },
    { key: 'goals', label: 'Goals', format: 'int', higherIsBetter: true, get: (p) => p.profile.totals.goals },
    {
        key: 'assists',
        label: 'Assists',
        format: 'int',
        higherIsBetter: true,
        get: (p) => p.profile.totals.assists,
    },
    { key: 'xg', label: 'xG', format: 'ratio', higherIsBetter: true, get: (p) => p.season.xg },
    { key: 'xa', label: 'xA', format: 'ratio', higherIsBetter: true, get: (p) => p.season.xa },
    {
        key: 'minutes',
        label: 'Minutes',
        format: 'int',
        higherIsBetter: null,
        get: (p) => p.profile.totals.minutes,
    },
    {
        key: 'pGoal',
        label: 'Goal chance, next match',
        format: 'chance',
        higherIsBetter: true,
        get: (p) => nextMatch(p)?.pGoal ?? null,
    },
    {
        key: 'pAssist',
        label: 'Assist chance, next match',
        format: 'chance',
        higherIsBetter: true,
        get: (p) => nextMatch(p)?.pAssist ?? null,
    },
    {
        key: 'pStart',
        label: 'Start chance, next match',
        format: 'chance',
        higherIsBetter: true,
        get: (p) => nextMatch(p)?.pStart ?? null,
    },
    {
        key: 'xPts',
        label: 'Expected points, next match',
        format: 'points',
        higherIsBetter: true,
        get: (p) => nextMatch(p)?.expectedPoints ?? null,
    },
]

export function compareRows(players: ScoutProfile[]): CompareRow[] {
    return SPECS.map(({ key, label, format, higherIsBetter, get }) => {
        const values = players.map(get)

        return {
            key,
            label,
            values,
            best: higherIsBetter === null ? [] : bestIndexes(values, higherIsBetter),
            format,
        }
    })
}

const show = (value: number | null, format: CellFormat): string => {
    if (value === null) return '—'

    switch (format) {
        case 'price':
            return formatPrice(value)
        case 'points':
            return formatPoints(value)
        case 'ratio':
            return value.toFixed(2)
        case 'chance':
            return formatChance(value)
        case 'int':
            return String(value)
    }
}

export function CompareTable({ players }: { players: ScoutProfile[] }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Measure</TableHead>
                    {players.map((p) => (
                        <TableHead key={p.profile.player.id} className="text-right">
                            {p.profile.player.name}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {compareRows(players).map((row) => (
                    <TableRow key={row.key}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        {row.values.map((value, i) => (
                            <TableCell
                                key={players[i].profile.player.id}
                                className={`text-right tabular-nums ${row.best.includes(i) ? 'font-semibold text-primary' : ''}`}
                            >
                                {row.best.includes(i) && (
                                    <>
                                        <span aria-hidden="true">★ </span>
                                        <span className="sr-only">Best: </span>
                                    </>
                                )}
                                {show(value, row.format)}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
