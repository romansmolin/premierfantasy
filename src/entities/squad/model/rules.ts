export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

export interface PositionRule {
    /** Players of this position in the 15-man squad. */
    squadSelect: number
    /** Allowed range in the starting XI. */
    minPlay: number
    maxPlay: number
}

export interface SquadRules {
    squadSize: number
    startingSize: number
    /** Tenths of a million: 1000 = £100.0m. */
    budgetTenths: number
    teamLimit: number
    positions: Record<Position, PositionRule>
}

/**
 * FPL rules as stored in `fpl_game_settings` (Task part 1 syncs them from FPL). Used only until that table has a row,
 * so the builder keeps working; the values are FPL's current ones.
 */
export const DEFAULT_SQUAD_RULES: SquadRules = {
    squadSize: 15,
    startingSize: 11,
    budgetTenths: 1000,
    teamLimit: 3,
    positions: {
        GK: { squadSelect: 2, minPlay: 1, maxPlay: 1 },
        DEF: { squadSelect: 5, minPlay: 3, maxPlay: 5 },
        MID: { squadSelect: 5, minPlay: 2, maxPlay: 5 },
        FWD: { squadSelect: 3, minPlay: 1, maxPlay: 3 },
    },
}

export interface SquadPlayerInfo {
    playerId: string
    position: Position
    clubId: string
    /** Null when there is no fresh FPL price. */
    priceTenths: number | null
}

export interface SquadDraft {
    /** The starting XI. */
    starters: string[]
    /** The substitutes in substitution order. */
    bench: string[]
    captainId: string
    viceCaptainId: string
}

export interface SquadValidation {
    valid: boolean
    errors: string[]
    formation: string | null
    totalTenths: number | null
    /** False when some price is unknown: the budget was not verified. */
    budgetChecked: boolean
}

const OUTFIELD: Position[] = ['DEF', 'MID', 'FWD']

export function formationOf(starters: string[], pool: Map<string, SquadPlayerInfo>): string {
    const count = (position: Position) => starters.filter((id) => pool.get(id)?.position === position).length

    return OUTFIELD.map(count).join('-')
}

/** Checks a squad against the FPL rules; every broken rule is reported. */
export function validateSquad(
    draft: SquadDraft,
    pool: Map<string, SquadPlayerInfo>,
    rules: SquadRules,
): SquadValidation {
    const errors: string[] = []
    const all = [...draft.starters, ...draft.bench]
    const unique = new Set(all)

    if (all.length !== rules.squadSize || unique.size !== all.length) {
        errors.push(`The squad must have ${rules.squadSize} different players`)
    }

    if (draft.starters.length !== rules.startingSize) {
        errors.push(`The starting XI must have ${rules.startingSize} players`)
    }

    const unknown = all.filter((id) => !pool.has(id))

    if (unknown.length > 0) {
        errors.push('Some players are not available')

        return { valid: false, errors, formation: null, totalTenths: null, budgetChecked: false }
    }

    const players = all.map((id) => pool.get(id) as SquadPlayerInfo)

    for (const position of Object.keys(rules.positions) as Position[]) {
        const have = players.filter((p) => p.position === position).length

        if (have !== rules.positions[position].squadSelect) {
            errors.push(`The squad needs ${rules.positions[position].squadSelect} ${position}, found ${have}`)
        }
    }

    const perClub = new Map<string, number>()

    for (const p of players) perClub.set(p.clubId, (perClub.get(p.clubId) ?? 0) + 1)

    if ([...perClub.values()].some((n) => n > rules.teamLimit)) {
        errors.push(`At most ${rules.teamLimit} players from one club`)
    }

    const startingPlayers = draft.starters.map((id) => pool.get(id) as SquadPlayerInfo)

    for (const position of Object.keys(rules.positions) as Position[]) {
        const n = startingPlayers.filter((p) => p.position === position).length
        const { minPlay, maxPlay } = rules.positions[position]

        if (n < minPlay || n > maxPlay) {
            errors.push(
                `The starting XI needs ${minPlay === maxPlay ? minPlay : `${minPlay}-${maxPlay}`} ${position}, found ${n}`,
            )
        }
    }

    const prices = players.map((p) => p.priceTenths)
    const budgetChecked = prices.every((p) => p !== null)
    const totalTenths = budgetChecked ? (prices as number[]).reduce((a, b) => a + b, 0) : null

    // Unknown prices cannot rescue a squad whose known prices already break the budget.
    const knownTenths = prices.reduce<number>((sum, p) => sum + (p ?? 0), 0)

    if (knownTenths > rules.budgetTenths) {
        errors.push(`Over the budget of £${(rules.budgetTenths / 10).toFixed(1)}m`)
    }

    if (!draft.captainId || !draft.viceCaptainId) {
        errors.push('Choose a captain and a vice-captain')
    } else {
        if (draft.captainId === draft.viceCaptainId)
            errors.push('Captain and vice-captain must be different players')

        if (!draft.starters.includes(draft.captainId) || !draft.starters.includes(draft.viceCaptainId)) {
            errors.push('Captain and vice-captain must be in the starting XI')
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        formation: formationOf(draft.starters, pool),
        totalTenths,
        budgetChecked,
    }
}
