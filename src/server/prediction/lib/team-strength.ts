export interface FinishedMatch {
    kickoff: Date
    homeTeamId: string
    awayTeamId: string
    homeGoals: number
    awayGoals: number
}

export interface TeamStrengths {
    /** Goals per team per match in the window. */
    leagueGoalsPerTeam: number
    /** 1 = league average, higher = scores more. */
    attack: Map<string, number>
    /** 1 = league average, higher = concedes more. */
    defence: Map<string, number>
}

const DEFAULT_LEAGUE_GOALS = 1.4
const HOME_FACTOR = 1.15
const AWAY_FACTOR = 0.87

/** Last `lastN` matches of every team before the cutoff, shrunk toward the league average by `priorMatches`. */
export function computeTeamStrengths(
    matches: FinishedMatch[],
    cutoff: Date,
    { lastN = 8, priorMatches = 4 }: { lastN?: number; priorMatches?: number } = {},
): TeamStrengths {
    const before = matches.filter((m) => m.kickoff.getTime() < cutoff.getTime())
    const totalGoals = before.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0)
    const league = before.length === 0 ? DEFAULT_LEAGUE_GOALS : totalGoals / (2 * before.length)
    const perTeam = new Map<string, { time: number; scored: number; conceded: number }[]>()

    for (const m of before) {
        const time = m.kickoff.getTime()

        for (const [team, scored, conceded] of [
            [m.homeTeamId, m.homeGoals, m.awayGoals],
            [m.awayTeamId, m.awayGoals, m.homeGoals],
        ] as const) {
            perTeam.set(team, [...(perTeam.get(team) ?? []), { time, scored, conceded }])
        }
    }

    const attack = new Map<string, number>()
    const defence = new Map<string, number>()

    for (const [team, games] of perTeam) {
        const recent = games.sort((a, b) => b.time - a.time).slice(0, lastN)
        const scored = recent.reduce((sum, g) => sum + g.scored, 0)
        const conceded = recent.reduce((sum, g) => sum + g.conceded, 0)

        attack.set(team, (scored + league * priorMatches) / (recent.length + priorMatches) / league)
        defence.set(team, (conceded + league * priorMatches) / (recent.length + priorMatches) / league)
    }

    return { leagueGoalsPerTeam: league, attack, defence }
}

/** Expected goals of `teamId` (for) and against it in a match against `opponentId`. */
export function expectedGoals(
    s: TeamStrengths,
    teamId: string,
    opponentId: string,
    isHome: boolean,
): { for: number; against: number } {
    const venueFor = isHome ? HOME_FACTOR : AWAY_FACTOR
    const venueAgainst = isHome ? AWAY_FACTOR : HOME_FACTOR

    return {
        for: s.leagueGoalsPerTeam * (s.attack.get(teamId) ?? 1) * (s.defence.get(opponentId) ?? 1) * venueFor,
        against:
            s.leagueGoalsPerTeam *
            (s.attack.get(opponentId) ?? 1) *
            (s.defence.get(teamId) ?? 1) *
            venueAgainst,
    }
}
