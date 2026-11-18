import { MAX_COMPARE } from './params'

import type { Position } from '@/server/prediction/lib/scoring-rules'

/** Indexes holding the best value; empty when fewer than two values exist or all of them are equal. */
export function bestIndexes(values: (number | null)[], higherIsBetter: boolean): number[] {
    const present = values.filter((v): v is number => v !== null)

    if (present.length < 2) return []

    const best = higherIsBetter ? Math.max(...present) : Math.min(...present)

    if (present.every((v) => v === best)) return []

    return values.flatMap((v, i) => (v === best ? [i] : []))
}

export type CompareCheck = { ok: true } | { ok: false; reason: string }

interface Candidate {
    id: string
    position: Position
}

export function canCompare(selected: Candidate[], candidate: Candidate): CompareCheck {
    if (selected.some((s) => s.id === candidate.id)) {
        return { ok: false, reason: 'This player is already in the comparison.' }
    }

    if (selected.length >= MAX_COMPARE) {
        return { ok: false, reason: `You can compare up to ${MAX_COMPARE} players at once.` }
    }

    if (selected.some((s) => s.position !== candidate.position)) {
        return { ok: false, reason: 'Compare players of one position: their stats are not comparable.' }
    }

    return { ok: true }
}
