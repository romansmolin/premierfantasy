import { normalizeName } from './normalize-name'

import type { FplTeam } from './fpl.types'

export interface OurTeam {
    id: string
    name: string
    shortName: string
}

/** Names the two sources use for the same club. Each group is compared after normalizing. */
const ALIAS_GROUPS = [
    ['man city', 'manchester city'],
    ['man utd', 'man united', 'manchester united'],
    ['spurs', 'tottenham', 'tottenham hotspur'],
    ['nottm forest', 'nottingham forest'],
    ['wolves', 'wolverhampton wanderers', 'wolverhampton'],
    ['newcastle', 'newcastle united'],
    ['brighton', 'brighton hove albion', 'brighton and hove albion'],
    ['leeds', 'leeds united'],
    ['west ham', 'west ham united'],
    ['bournemouth', 'afc bournemouth'],
]

const canonical = (value: string): string => {
    const normalized = normalizeName(value.replace(/&/g, ' '))
        .replace(/\band\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    const group = ALIAS_GROUPS.find((names) =>
        names
            .map((n) =>
                n
                    .replace(/\band\b/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim(),
            )
            .includes(normalized),
    )

    return group ? group[0] : normalized
}

export function matchTeams(
    fplTeams: FplTeam[],
    ours: OurTeam[],
): { map: Map<number, string>; unmatched: FplTeam[] } {
    const map = new Map<number, string>()
    const unmatched: FplTeam[] = []

    for (const team of fplTeams) {
        const key = canonical(team.name)
        const byName = ours.filter((o) => canonical(o.name) === key)
        const byShort = ours.filter((o) => normalizeName(o.shortName) === normalizeName(team.short_name))
        const found =
            byName.length === 1 ? byName[0] : byName.length === 0 && byShort.length === 1 ? byShort[0] : null

        if (found) map.set(team.id, found.id)
        else unmatched.push(team)
    }

    return { map, unmatched }
}
