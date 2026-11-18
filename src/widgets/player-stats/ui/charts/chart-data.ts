import type { FormMatch, PlayerProbabilityCard } from '@/server/stats/service/stats.service.interface'

export type FormPeriod = 5 | 10

export type BucketLabel = '0–2' | '3–5' | '6–9' | '10+'

const BUCKET_LABELS: BucketLabel[] = ['0–2', '3–5', '6–9', '10+']

/** `unstable_cache` JSON-round-trips results, so a cached kickoff arrives as an ISO string. */
type CachedFormMatch = Omit<FormMatch, 'kickoff'> & { kickoff: Date | string }

const byKickoff = (a: CachedFormMatch, b: CachedFormMatch): number =>
    new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()

const matchLabel = (opponentName: string, isHome: boolean): string =>
    isHome ? `vs ${opponentName} (H)` : `at ${opponentName} (A)`

/** Last `period` matches in kickoff order; a double gameweek stays two entries. */
export function formSeries(
    matches: CachedFormMatch[],
    period: FormPeriod,
): { label: string; goals: number; xg: number | null; assists: number; xa: number | null; hasXg: boolean }[] {
    return [...matches]
        .sort(byKickoff)
        .slice(-period)
        .map((m) => ({
            label: matchLabel(m.opponentName, m.isHome),
            goals: m.goals,
            xg: m.xg,
            assists: m.assists,
            xa: m.xa,
            hasXg: m.xg !== null,
        }))
}

export function goalOutlookSeries(
    matches: PlayerProbabilityCard['matches'],
): { label: string; horizon: number; pGoal: number | null }[] {
    return matches.map((m) => ({
        label: matchLabel(m.opponentName, m.isHome),
        horizon: m.horizon,
        pGoal: m.pGoal,
    }))
}

export function bucketBars(buckets: number[] | null): { label: BucketLabel; share: number }[] | null {
    if (buckets === null) return null

    return BUCKET_LABELS.map((label, i) => ({ label, share: buckets[i] ?? 0 }))
}

export function minutesSeries(
    matches: CachedFormMatch[],
): { label: string; minutes: number; role: 'start' | 'sub' | 'unused' }[] {
    return [...matches].sort(byKickoff).map((m) => ({
        label: matchLabel(m.opponentName, m.isHome),
        minutes: m.minutes,
        role: m.minutes === 0 ? 'unused' : m.started ? 'start' : 'sub',
    }))
}
