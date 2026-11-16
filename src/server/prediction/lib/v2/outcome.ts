import { poissonPmf } from '../math'

/** Home/draw/away probabilities from independent Poisson goals, scores summed to `maxGoals` and renormalised. */
export function outcomeProbabilities(
    xgHome: number,
    xgAway: number,
    maxGoals = 10,
): { home: number; draw: number; away: number } {
    const home = Array.from({ length: maxGoals + 1 }, (_, k) => poissonPmf(k, xgHome))
    const away = Array.from({ length: maxGoals + 1 }, (_, k) => poissonPmf(k, xgAway))
    let h = 0
    let d = 0
    let a = 0

    for (let i = 0; i <= maxGoals; i += 1) {
        for (let j = 0; j <= maxGoals; j += 1) {
            const p = home[i] * away[j]

            if (i > j) h += p
            else if (i === j) d += p
            else a += p
        }
    }

    const total = h + d + a

    return { home: h / total, draw: d / total, away: a / total }
}
