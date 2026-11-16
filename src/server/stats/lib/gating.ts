import type { Horizon } from '@/server/prediction/lib/v2/evaluation'

/** A gated-off number is hidden as null, never shown as 0. */
export const gated = (value: number | null, on: boolean): number | null => (on ? value : null)

/** Horizon 1 is the next match (own gate); 2..5 share the 'later' gate. */
export const gateHorizon = (horizon: number): Horizon => (horizon <= 1 ? 'next' : 'later')

/**
 * 1-based match index of each fixture for its clubs (kickoff order): the larger of the two clubs' indexes,
 * so a fixture counts as 'next' only when it is the next match of both clubs.
 */
export function fixtureHorizons(
    fixtures: { id: string; kickoff: Date; homeId: string; awayId: string }[],
): Map<string, number> {
    const seen = new Map<string, number>()
    const result = new Map<string, number>()

    for (const f of [...fixtures].sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())) {
        const home = (seen.get(f.homeId) ?? 0) + 1
        const away = (seen.get(f.awayId) ?? 0) + 1

        seen.set(f.homeId, home)
        seen.set(f.awayId, away)
        result.set(f.id, Math.max(home, away))
    }

    return result
}
