export interface ExplainFacts {
    startsOfLast: { started: number; of: number } | null
    penaltyOrder: number | null
    goalsLast10: number | null
    xgLast10: number | null
    expectedTeamGoals: number | null
    leagueGoals: number | null
    unavailable: string | null
}

const MIN_GOALS_GAP = 0.3
const MIN_XG_GAP = 1
const MAX_SENTENCES = 3

/** Up to three plain-English reasons behind a forecast, most important first. */
export function explainForecast(f: ExplainFacts): string[] {
    const out: string[] = []

    if (f.unavailable) out.push(`Unavailable: ${f.unavailable}`)

    if (f.startsOfLast)
        out.push(`Started ${f.startsOfLast.started} of the last ${f.startsOfLast.of} team matches`)

    if (f.penaltyOrder === 1) out.push('First-choice penalty taker')

    if (f.expectedTeamGoals !== null && f.leagueGoals !== null) {
        const gap = f.expectedTeamGoals - f.leagueGoals

        if (Math.abs(gap) >= MIN_GOALS_GAP) {
            out.push(
                `Team is expected to score ${f.expectedTeamGoals.toFixed(1)} goals here (league average ${f.leagueGoals.toFixed(1)}), a ${gap > 0 ? 'high' : 'low'}-scoring setup`,
            )
        }
    }

    if (f.xgLast10 !== null && f.goalsLast10 !== null && Math.abs(f.goalsLast10 - f.xgLast10) >= MIN_XG_GAP) {
        out.push(
            `Scored ${f.goalsLast10} ${f.goalsLast10 === 1 ? 'goal' : 'goals'} from ${f.xgLast10.toFixed(1)} xG in the last 10`,
        )
    }

    return out.slice(0, MAX_SENTENCES)
}
