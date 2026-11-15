import type { PlayerPosition } from '@/entities/players/model/player.types'

import { normalizeName } from './normalize-name'

import type { FplElement } from './fpl.types'

export interface OurPlayer {
    id: string
    name: string
    position: PlayerPosition
    teamId: string
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

const POSITION_BY_ELEMENT_TYPE: Record<number, PlayerPosition> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' }

const EXACT = 1
const SURNAME = 0.8

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
        first.length === 1 ? fplFirst.some((token) => token[0] === first) : fplFirst.includes(first)

    return firstMatches ? SURNAME : 0
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

    for (const element of fpl) {
        const teamId = teamMap.get(element.team)
        const position = POSITION_BY_ELEMENT_TYPE[element.element_type]
        const candidates = ours
            .filter((player) => player.teamId === teamId && player.position === position)
            .map((player) => ({
                playerId: player.id,
                score: score(element, ourNames.get(player.id) as string),
            }))
            .filter((candidate) => candidate.score > 0)
            .sort((a, b) => b.score - a.score)

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
