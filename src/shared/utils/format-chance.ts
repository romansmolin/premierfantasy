/** A probability as a whole percent; the tails never show 0% or 100% because no forecast is that sure. */
export function formatChance(p: number | null): string {
    if (p === null) return '—'

    const pct = Math.round(p * 100)

    if (pct < 1) return '<1%'

    if (pct > 99) return '>99%'

    return `${pct}%`
}
