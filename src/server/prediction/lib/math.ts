export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x))

export const mean = (xs: number[]): number =>
    xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length

export function weightedMean(values: number[], weights: number[]): number {
    let total = 0
    let sum = 0

    for (let i = 0; i < values.length; i += 1) {
        total += weights[i]
        sum += values[i] * weights[i]
    }

    return total === 0 ? 0 : sum / total
}

/** Newest first: [1, d, d², …]. */
export function decayWeights(n: number, decay: number): number[] {
    return Array.from({ length: n }, (_, i) => decay ** i)
}

/** Sample rate pulled toward a prior as if the prior had been observed for `priorExposure`. */
export function shrunkRate(sum: number, exposure: number, priorRate: number, priorExposure: number): number {
    return (sum + priorRate * priorExposure) / (exposure + priorExposure)
}

export function poissonPmf(k: number, lambda: number): number {
    if (lambda <= 0) return k === 0 ? 1 : 0

    let logFactorial = 0

    for (let i = 2; i <= k; i += 1) logFactorial += Math.log(i)

    return Math.exp(-lambda + k * Math.log(lambda) - logFactorial)
}

/** P(X >= k) for X ~ Poisson(lambda). */
export function poissonAtLeast(k: number, lambda: number): number {
    let below = 0

    for (let i = 0; i < k; i += 1) below += poissonPmf(i, lambda)

    return clamp(1 - below, 0, 1)
}

/** E[floor(G / 2)] for G ~ Poisson(lambda): the expected goals-conceded penalty of a defender. */
export function expectedHalfConceded(lambda: number): number {
    let total = 0

    for (let g = 2; g <= 40; g += 1) total += poissonPmf(g, lambda) * Math.floor(g / 2)

    return total
}

export function mae(predicted: number[], actual: number[]): number {
    return mean(predicted.map((p, i) => Math.abs(p - actual[i])))
}

function ranks(xs: number[]): number[] {
    const order = xs.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value)
    const result = new Array<number>(xs.length)

    for (let i = 0; i < order.length; ) {
        let j = i

        while (j + 1 < order.length && order[j + 1].value === order[i].value) j += 1

        const rank = (i + j) / 2 + 1

        for (let k = i; k <= j; k += 1) result[order[k].index] = rank

        i = j + 1
    }

    return result
}

/** Spearman rank correlation with average ranks for ties; 0 when it is undefined. */
export function spearman(xs: number[], ys: number[]): number {
    if (xs.length < 2) return 0

    const rx = ranks(xs)
    const ry = ranks(ys)
    const mx = mean(rx)
    const my = mean(ry)
    let cov = 0
    let vx = 0
    let vy = 0

    for (let i = 0; i < rx.length; i += 1) {
        cov += (rx[i] - mx) * (ry[i] - my)
        vx += (rx[i] - mx) ** 2
        vy += (ry[i] - my) ** 2
    }

    return vx === 0 || vy === 0 ? 0 : cov / Math.sqrt(vx * vy)
}

/** Ordinary least squares y = intercept + slope·x. */
export function fitLinear(xs: number[], ys: number[]): { intercept: number; slope: number } {
    const mx = mean(xs)
    const my = mean(ys)
    let cov = 0
    let vx = 0

    for (let i = 0; i < xs.length; i += 1) {
        cov += (xs[i] - mx) * (ys[i] - my)
        vx += (xs[i] - mx) ** 2
    }

    if (vx === 0) return { intercept: my, slope: 0 }

    const slope = cov / vx

    return { intercept: my - slope * mx, slope }
}
