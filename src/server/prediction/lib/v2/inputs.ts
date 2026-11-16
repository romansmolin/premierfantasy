import { availabilityFactor, MAX_APPEARANCES, prepareEvent, TEAM_MATCHES, toLine } from '../inputs'
import { expectedGoals } from '../team-strength'

import { HORIZON_MATCHES } from './params'

import type { ForecastDataset } from '../inputs'
import type { TeamStrengths } from '../team-strength'
import type { PlayerInputV2, V2Fixture } from './model'

export interface BuiltInputV2 {
    playerId: string
    teamId: string
    input: PlayerInputV2
}

/**
 * v2 inputs for every FPL-mapped player, using only what was known before the event's first kickoff. Fixtures
 * are the team's next `HORIZON_MATCHES` matches from the cutoff, any event or status.
 */
export function buildInputsV2(
    data: ForecastDataset,
    event: number | 'next',
    opts: { useAvailability: boolean },
): { event: number | null; cutoff: Date | null; inputs: BuiltInputV2[]; strengths: TeamStrengths | null } {
    const { event: eventId, prepared } = prepareEvent(data, event)

    if (!prepared) return { event: eventId, cutoff: null, inputs: [], strengths: null }

    const { cutoff, strengths, finished, priors, byPlayer } = prepared
    const upcoming = data.fixtures
        .filter((f) => f.kickoff >= cutoff)
        .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())
    const inputs: BuiltInputV2[] = []

    for (const player of data.players) {
        // Copy: prepared arrays are shared with other models.
        const lines = [...(byPlayer.get(player.playerId) ?? [])].sort(
            (a, b) => b.kickoff.getTime() - a.kickoff.getTime(),
        )
        const teamId = opts.useAvailability
            ? (player.currentTeamId ?? lines[0]?.teamId)
            : (lines[0]?.teamId ?? player.currentTeamId)

        if (!teamId) continue

        const lineByFixture = new Map(lines.map((l) => [l.fixtureId, l]))
        // Only rows of lines before the cutoff are looked up, so FPL data never leaks from the future.
        const fplByFixture = new Map(
            (data.fplMatches.get(player.playerId) ?? []).map((r) => [r.fixtureId, r]),
        )
        const plays = (f: { homeTeamId: string; awayTeamId: string }) =>
            f.homeTeamId === teamId || f.awayTeamId === teamId
        const baseline = strengths.leagueGoalsPerTeam * (strengths.attack.get(teamId) ?? 1)
        const fixtures: V2Fixture[] = upcoming
            .filter(plays)
            .slice(0, HORIZON_MATCHES)
            .map((f) => {
                const isHome = f.homeTeamId === teamId
                const opponentTeamId = isHome ? f.awayTeamId : f.homeTeamId
                const goals = expectedGoals(strengths, teamId, opponentTeamId, isHome)

                return {
                    fixtureId: f.fixtureId,
                    kickoff: f.kickoff,
                    opponentTeamId,
                    isHome,
                    teamGoalsFor: goals.for,
                    teamGoalsAgainst: goals.against,
                    teamBaselineGoals: baseline,
                }
            })

        inputs.push({
            playerId: player.playerId,
            teamId,
            input: {
                position: player.position,
                appearances: lines
                    .filter((l) => l.minutes > 0)
                    .slice(0, MAX_APPEARANCES)
                    .map((l) => {
                        const fpl = fplByFixture.get(l.fixtureId)

                        return {
                            ...toLine(l),
                            xg: fpl?.xg ?? null,
                            xa: fpl?.xa ?? null,
                            started: l.isStarter,
                        }
                    }),
                teamMatches: finished
                    .filter(plays)
                    .slice(0, TEAM_MATCHES)
                    .map((f) => {
                        const l = lineByFixture.get(f.fixtureId)

                        return { minutes: l?.minutes ?? 0, started: l?.isStarter ?? false }
                    }),
                availability: opts.useAvailability
                    ? availabilityFactor(data.availability.get(player.playerId))
                    : 1,
                fixtures,
                prior: priors[player.position],
            },
        })
    }

    return { event: eventId, cutoff, inputs, strengths }
}
