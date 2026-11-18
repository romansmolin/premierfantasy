import type { ScoutListItem } from '@/entities/scout'

import type { Position } from '@/server/prediction/lib/scoring-rules'

export type ScoutSort =
    | 'forecast'
    | 'form'
    | 'value'
    | 'price'
    | 'minutes'
    | 'goals'
    | 'assists'
    | 'pGoal'
    | 'pAssist'
    | 'pStart'
    | 'name'

export interface ScoutFilters {
    q: string
    position: Position | ''
    clubId: string
    /** Millions; players without a fresh price are dropped when set. */
    maxPrice: number | null
    sort: ScoutSort
}

const fold = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const NUMBER: Record<Exclude<ScoutSort, 'name'>, (p: ScoutListItem) => number | null> = {
    forecast: (p) => p.forecast,
    form: (p) => p.form,
    value: (p) => p.pointsPerMillion,
    price: (p) => p.price,
    minutes: (p) => p.minutes,
    goals: (p) => p.goals,
    assists: (p) => p.assists,
    pGoal: (p) => p.next?.pGoal ?? null,
    pAssist: (p) => p.next?.pAssist ?? null,
    pStart: (p) => p.next?.pStart ?? null,
}

/** Filters, then sorts: numbers high to low with missing values last, names A to Z. */
export function queryPlayers(items: ScoutListItem[], f: ScoutFilters): ScoutListItem[] {
    const search = fold(f.q.trim())
    const filtered = items
        .filter((p) => !f.position || p.position === f.position)
        .filter((p) => !f.clubId || p.club.id === f.clubId)
        .filter((p) => f.maxPrice === null || (p.price !== null && p.price <= f.maxPrice))
        .filter((p) => !search || fold(p.name).includes(search))

    if (f.sort === 'name') return filtered.sort((a, b) => a.name.localeCompare(b.name))

    const value = NUMBER[f.sort]

    return filtered.sort((a, b) => {
        const x = value(a)
        const y = value(b)

        if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1

        return y - x
    })
}
