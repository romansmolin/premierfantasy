import { hashSeed } from './demo-roster'

/**
 * Believable single-gameweek fantasy score for a demo team.
 *
 * Deterministic in (fantasyTeamId, gameweekId): the same pair always yields the
 * same score, so a cron retry that races the insert computes an identical row —
 * and once persisted the unique index makes the write a no-op anyway.
 *
 * Shape: sum of three uniforms ≈ bell curve centred on ~45, clamped to 12–92.
 * Each team also gets a small persistent skill bias so the same names tend to
 * drift up or down a table, like real managers do. Integer output means ties
 * happen naturally.
 */
export function generateDemoGameweekScore(fantasyTeamId: string, gameweekId: string): number {
    const roll = (label: string) => hashSeed(`${label}:${fantasyTeamId}:${gameweekId}`) / 4294967296

    const base = (roll('a') + roll('b') + roll('c')) / 3

    // Per-team bias in [-8, +8], stable across gameweeks.
    const bias = (hashSeed(`skill:${fantasyTeamId}`) / 4294967296 - 0.5) * 16

    const score = Math.round(12 + base * 68 + bias)

    return Math.max(12, Math.min(92, score))
}
