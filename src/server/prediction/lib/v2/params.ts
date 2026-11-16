import { DEFAULT_PARAMS } from '../model'

import type { ModelParams } from '../model'

export const MODEL_VERSION_V2 = 'ewma-poisson-v2'

/** Matches ahead that one forecast covers. */
export const HORIZON_MATCHES = 5

/** Fewest appearances a player needs before a forecast is made. */
export const MIN_APPEARANCES = 3

export const POINT_BUCKETS = ['0–2', '3–5', '6–9', '10+'] as const

export function bucketOfPoints(points: number): 0 | 1 | 2 | 3 {
    if (points <= 2) return 0

    if (points <= 5) return 1

    if (points <= 9) return 2

    return 3
}

/** Initial defaults for the promotion gate. */
export const GATE = { minEvents: 8, minRecords: 300, minBucketN: 30, maxBucketGap: 0.07, minBrierEdge: 0.001 }

export interface V2Params extends ModelParams {
    xgWeight: number
    sims: number
    seed: number
}

export const DEFAULT_V2: V2Params = { ...DEFAULT_PARAMS, xgWeight: 0.5, sims: 2000, seed: 20261116 }
