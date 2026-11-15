/** "Regular Season - 11" → 11. Rounds without a trailing number (cup stages, play-offs) → null. */
export function parseRoundNumber(round: string): number | null {
    const match = /(\d+)\s*$/.exec(round)

    return match ? Number(match[1]) : null
}
