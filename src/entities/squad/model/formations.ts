import type { Position, SquadPlayerInfo, SquadRules } from './rules'

export interface Formation {
    def: number
    mid: number
    fwd: number
}

export const DEFAULT_FORMATION: Formation = { def: 4, mid: 4, fwd: 2 }

export const formationLabel = (f: Formation) => `${f.def}-${f.mid}-${f.fwd}`

/** Starting-XI slots per position for a formation. */
export function slotsOf(f: Formation): Record<Position, number> {
    return { GK: 1, DEF: f.def, MID: f.mid, FWD: f.fwd }
}

/** Every formation the rules allow, e.g. 3-4-3 … 5-4-1 for FPL. */
export function formationOptions(rules: SquadRules): Formation[] {
    const { GK, DEF, MID, FWD } = rules.positions
    const outfield = rules.startingSize - GK.maxPlay
    const options: Formation[] = []

    for (let def = DEF.minPlay; def <= DEF.maxPlay; def += 1) {
        for (let mid = MID.minPlay; mid <= MID.maxPlay; mid += 1) {
            const fwd = outfield - def - mid

            if (fwd >= FWD.minPlay && fwd <= FWD.maxPlay) options.push({ def, mid, fwd })
        }
    }

    return options
}

/** The formation a complete starting XI is playing; null while the XI is not full. */
export function formationFromStarters(
    starters: string[],
    pool: Map<string, SquadPlayerInfo>,
): Formation | null {
    const count = (position: Position) => starters.filter((id) => pool.get(id)?.position === position).length
    const f = { def: count('DEF'), mid: count('MID'), fwd: count('FWD') }

    return count('GK') === 1 && f.def + f.mid + f.fwd === starters.length - 1 && starters.length >= 11
        ? f
        : null
}
