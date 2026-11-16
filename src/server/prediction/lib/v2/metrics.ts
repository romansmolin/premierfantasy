import { mean } from '../math'

/** Mean squared error of probabilities against 0/1 outcomes. */
export function brier(p: number[], hit: boolean[]): number {
    return mean(p.map((x, i) => (x - (hit[i] ? 1 : 0)) ** 2))
}

/** Mean over rows of the sum over classes of (p_k − 1{k = actual})². */
export function brierMulti(p: number[][], actual: number[]): number {
    return mean(p.map((row, i) => row.reduce((sum, x, k) => sum + (x - (k === actual[i] ? 1 : 0)) ** 2, 0)))
}

export interface CalibrationBucket {
    lo: number
    hi: number
    n: number
    predicted: number
    observed: number
}

const round = (x: number): number => Math.round(x * 1e9) / 1e9

/** Ascending buckets of `width`; empty ones omitted; the last is closed on the right so p = 1 is included. */
export function calibrationBuckets(p: number[], hit: boolean[], width = 0.1): CalibrationBucket[] {
    const count = Math.round(1 / width)
    const groups = new Map<number, { ps: number[]; hits: number[] }>()

    p.forEach((x, i) => {
        const index = Math.min(count - 1, Math.max(0, Math.floor(round(x / width))))
        const group = groups.get(index) ?? { ps: [], hits: [] }

        group.ps.push(x)
        group.hits.push(hit[i] ? 1 : 0)
        groups.set(index, group)
    })

    return [...groups.keys()]
        .sort((a, b) => a - b)
        .map((index) => {
            const { ps, hits } = groups.get(index)!

            return {
                lo: round(index * width),
                hi: round((index + 1) * width),
                n: ps.length,
                predicted: mean(ps),
                observed: mean(hits),
            }
        })
}

export function mulberry32(seed: number): () => number {
    let a = seed >>> 0

    return () => {
        a = (a + 0x6d2b79f5) >>> 0

        let t = a

        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Knuth's method for λ ≤ 30; rounded normal approximation above that to stay fast. */
export function samplePoisson(lambda: number, rng: () => number): number {
    if (lambda <= 0) return 0

    if (lambda > 30) {
        const u1 = 1 - rng()
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng())

        return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z))
    }

    const limit = Math.exp(-lambda)
    let k = 0
    let product = rng()

    while (product > limit) {
        k += 1
        product *= rng()
    }

    return k
}
