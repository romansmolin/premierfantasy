import type { PlayerPosition } from '@/entities/players/model/player.types'

import { normalizeName } from './normalize-name'

import type { FplElement } from './fpl.types'

export interface OurPlayer {
    id: string
    name: string
    position: PlayerPosition
    teamId: string
    /** Has match statistics. Idle duplicates (legacy rows) lose against active players with the same name. */
    active?: boolean
}

export interface PlayerMatch {
    fplId: number
    playerId: string
    confidence: number
}

export interface PlayerCandidates {
    fplId: number
    candidates: { playerId: string; score: number }[]
}

export const POSITION_BY_ELEMENT_TYPE: Record<number, PlayerPosition> = {
    1: 'GK',
    2: 'DEF',
    3: 'MID',
    4: 'FWD',
}

const EXACT = 1
const SURNAME = 0.8
/** The two sources disagree on a player's position often (MID vs FWD, DEF vs MID): confidence is scaled down. */
const CROSS_POSITION_FACTOR = 0.75

function score(element: FplElement, ourName: string): number {
    const full = normalizeName(`${element.first_name} ${element.second_name}`)
    const web = normalizeName(element.web_name)

    if (ourName === full || ourName === web) return EXACT

    const ourTokens = ourName.split(' ')
    const surname = ourTokens[ourTokens.length - 1]
    const fplSurnames = new Set([...normalizeName(element.second_name).split(' '), ...web.split(' ')])

    if (!fplSurnames.has(surname)) return 0

    if (ourTokens.length === 1) return SURNAME

    const first = ourTokens[0]
    const fplFirst = normalizeName(element.first_name).split(' ')
    const firstMatches =
        first.length === 1
            ? fplFirst.some((token) => token[0] === first)
            : fplFirst.some((token) => token === first || isShortenedForm(token, first))

    return firstMatches ? SURNAME : 0
}

/** "josh" ↔ "joshua": one is a prefix of the other, both at least 3 letters. */
function isShortenedForm(a: string, b: string): boolean {
    return Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a))
}

/**
 * Matches FPL players to ours inside the same club and position. Never guesses: several equally good
 * candidates (or several FPL players for one of ours with equal confidence) are reported as ambiguous.
 */
export function matchPlayers(
    fpl: FplElement[],
    ours: OurPlayer[],
    teamMap: Map<number, string>,
): { matched: PlayerMatch[]; ambiguous: PlayerCandidates[]; unmatched: number[] } {
    const ambiguous: PlayerCandidates[] = []
    const unmatched: number[] = []
    const proposals: {
        fplId: number
        playerId: string
        score: number
        candidates: PlayerCandidates['candidates']
    }[] = []
    const ourNames = new Map(ours.map((player) => [player.id, normalizeName(player.name)]))
    const activeIds = new Set(ours.filter((player) => player.active).map((player) => player.id))

    for (const element of fpl) {
        const teamId = teamMap.get(element.team)
        const position = POSITION_BY_ELEMENT_TYPE[element.element_type]
        const inClub = ours.filter((player) => player.teamId === teamId)
        const scoreAll = (pool: OurPlayer[], factor: number) =>
            pool
                .map((player) => ({
                    playerId: player.id,
                    score: Math.round(score(element, ourNames.get(player.id) as string) * factor * 100) / 100,
                }))
                .filter((candidate) => candidate.score > 0)
        let candidates = scoreAll(
            inClub.filter((player) => player.position === position),
            1,
        )

        // Fallback for MID/FWD/DEF disagreements between the sources; goalkeepers are never mixed with outfield players.
        if (candidates.length === 0 && position !== 'GK') {
            candidates = scoreAll(
                // A one-word name carries no first-name evidence: too weak to cross positions on.
                inClub.filter(
                    (player) =>
                        player.position !== position &&
                        player.position !== 'GK' &&
                        (ourNames.get(player.id) as string).includes(' '),
                ),
                CROSS_POSITION_FACTOR,
            )
        }

        // An active player beats an idle one with the same name (legacy duplicates); idle players still match when alone.
        if (candidates.some((c) => activeIds.has(c.playerId))) {
            candidates = candidates.filter((c) => activeIds.has(c.playerId))
        }

        candidates.sort((a, b) => b.score - a.score)

        if (!teamId || candidates.length === 0) {
            unmatched.push(element.id)

            continue
        }

        const top = candidates.filter((candidate) => candidate.score === candidates[0].score)

        if (top.length > 1) {
            ambiguous.push({ fplId: element.id, candidates })

            continue
        }

        proposals.push({ fplId: element.id, playerId: top[0].playerId, score: top[0].score, candidates })
    }

    const matched: PlayerMatch[] = []
    const byPlayer = new Map<string, typeof proposals>()

    for (const proposal of proposals) {
        byPlayer.set(proposal.playerId, [...(byPlayer.get(proposal.playerId) ?? []), proposal])
    }

    for (const [playerId, group] of byPlayer) {
        const best = Math.max(...group.map((p) => p.score))
        const winners = group.filter((p) => p.score === best)

        if (winners.length === 1) {
            matched.push({ fplId: winners[0].fplId, playerId, confidence: best })
        } else {
            for (const winner of winners)
                ambiguous.push({ fplId: winner.fplId, candidates: winner.candidates })
        }

        for (const loser of group.filter((p) => p.score < best)) unmatched.push(loser.fplId)
    }

    return { matched, ambiguous, unmatched }
}
