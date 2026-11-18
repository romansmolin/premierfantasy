import { formatChance } from '@/shared/utils/format-chance'

import type { HeatmapClub } from '@/server/stats/service/stats.service.interface'

export type HeatmapMetric = 'xg' | 'cs'

type HeatmapMatch = HeatmapClub['cells'][number]['matches'][number]

/** The number printed in a cell: expected goals with one decimal, or the clean-sheet chance. */
export function cellValue(match: HeatmapMatch, metric: HeatmapMetric): string {
    return metric === 'xg' ? match.xgFor.toFixed(1) : formatChance(match.pCleanSheet)
}

/** Value that gets the strongest shade: 3 expected goals, or a certain clean sheet. */
const SHADE_MAX: Record<HeatmapMetric, number> = { xg: 3, cs: 1 }

/** One emerald hue; alpha runs 0.1..0.5 so light text stays >= 4.5:1 on the dark card (checked in the test). */
export function heatShade(value: number, metric: HeatmapMetric): { background: string } {
    const t = Math.min(1, Math.max(0, value / SHADE_MAX[metric]))

    return { background: `hsla(160, 84%, 39%, ${(0.1 + 0.4 * t).toFixed(3)})` }
}
