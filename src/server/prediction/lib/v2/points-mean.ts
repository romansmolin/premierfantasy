import { passesBar, pointsAccuracy } from '../evaluation'

import type { Position } from '../scoring-rules'

/** Event-level expected points of v1 and v2 on the same player-event. */
export interface PointsRecord {
    event: number
    position: Position
    v1: number
    v2: number
    baseline: number
    actual: number
}

export interface PointsMean {
    passed: boolean
    maeV2: number
    maeV1: number
    rankCorrV2: number
    rankCorrV1: number
    n: number
    reasons: string[]
}

/** v2 points must clear the stage-2 bar and be no worse than v1 on the same records. */
export function pointsMeanCheck(records: PointsRecord[]): PointsMean {
    const v2 = pointsAccuracy(records, (r) => r.v2)
    const v1 = pointsAccuracy(records, (r) => r.v1)
    const baseline = pointsAccuracy(records, (r) => r.baseline)
    const { reasons } = passesBar({
        eventsEvaluated: new Set(records.map((r) => r.event)).size,
        playerEvents: records.length,
        mae: v2.mae,
        baselineMae: baseline.mae,
        rankCorr: v2.rankCorr,
        baselineRankCorr: baseline.rankCorr,
    })

    if (!(v2.mae <= v1.mae)) reasons.push('v2 MAE is worse than v1 on the same records')

    if (!(v2.rankCorr >= v1.rankCorr))
        reasons.push('v2 rank correlation is worse than v1 on the same records')

    return {
        passed: reasons.length === 0,
        maeV2: v2.mae,
        maeV1: v1.mae,
        rankCorrV2: v2.rankCorr,
        rankCorrV1: v1.rankCorr,
        n: records.length,
        reasons,
    }
}
