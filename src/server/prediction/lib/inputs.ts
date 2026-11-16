import { computeTeamStrengths, expectedGoals } from './team-strength'

import type { FixtureContext, MatchLine, PlayerInput, PositionPrior } from './model'
import type { Position } from './scoring-rules'
import type { FinishedMatch, TeamStrengths } from './team-strength'

export interface StoredMatch {
    kickoff: Date
    fixtureId: string
    teamId: string
    playerId: string
    minutes: number
    goals: number
    assists: number
    saves: number
    yellowCards: number
    redCards: number
    tackles: number
    blocks: number
    interceptions: number
    /** False when the player came off the bench. */
    isStarter: boolean
    position: Position | null
}

export interface DatasetFixture {
    fixtureId: string
    kickoff: Date
    homeTeamId: string
    awayTeamId: string
    homeGoals: number | null
    awayGoals: number | null
    fplEvent: number | null
    status: string
}

/** One FPL per-match line of a player. `fixtureId` is our `Fixture.id`, matched through `Fixture.fplFixtureId`. */
export interface FplMatchRow {
    fixtureId: string
    event: number
    minutes: number
    started: boolean
    goals: number
    assists: number
    xg: number | null
    xa: number | null
    totalPoints: number
    wasHome: boolean
}

export interface ForecastDataset {
    /** Every player line of the stored seasons, any order. */
    matches: StoredMatch[]
    fixtures: DatasetFixture[]
    /** FPL-mapped players only. */
    players: { playerId: string; fplId: number; position: Position; currentTeamId: string | null }[]
    /** playerId → event → FPL actual points. */
    fplPoints: Map<string, Map<number, { totalPoints: number; minutes: number }>>
    /** playerId → FPL per-match rows, any order; rows whose FPL fixture is not in our table are dropped. */
    fplMatches: Map<string, FplMatchRow[]>
    availability: Map<string, { status: string; chanceOfPlaying: number | null }>
    events: { id: number; finished: boolean; isNext: boolean; isCurrent: boolean }[]
}

const FINISHED = new Set(['FT', 'AET', 'PEN'])
const TEAM_MATCHES = 6
const MAX_APPEARANCES = 10
const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']

/** FPL status and chance of playing as a 0..1 multiplier on expected minutes. */
export function availabilityFactor(a?: { status: string; chanceOfPlaying: number | null }): number {
    if (!a) return 1

    if (a.chanceOfPlaying !== null) return Math.min(1, Math.max(0, a.chanceOfPlaying / 100))

    if (a.status === 'a') return 1

    if (a.status === 'd') return 0.75

    return 0
}

const FALLBACK_PRIORS: Record<Position, PositionPrior> = {
    GK: { goals: 0.005, assists: 0.01, saves: 2.8, yellowCards: 0.06, redCards: 0.005, defensiveActions: 0 },
    DEF: { goals: 0.05, assists: 0.07, saves: 0, yellowCards: 0.15, redCards: 0.008, defensiveActions: 6 },
    MID: { goals: 0.1, assists: 0.1, saves: 0, yellowCards: 0.17, redCards: 0.006, defensiveActions: 3.5 },
    FWD: { goals: 0.35, assists: 0.12, saves: 0, yellowCards: 0.1, redCards: 0.006, defensiveActions: 2 },
}

/** League-wide rates per 90 minutes by position from lines before the cutoff. */
export function positionPriors(matches: StoredMatch[], cutoff: Date): Record<Position, PositionPrior> {
    const result = {} as Record<Position, PositionPrior>

    for (const position of POSITIONS) {
        const lines = matches.filter((m) => m.position === position && m.minutes > 0 && m.kickoff < cutoff)
        const exposure = lines.reduce((sum, m) => sum + m.minutes / 90, 0)

        if (exposure === 0) {
            result[position] = FALLBACK_PRIORS[position]

            continue
        }

        const per90 = (pick: (m: StoredMatch) => number) =>
            lines.reduce((sum, m) => sum + pick(m), 0) / exposure

        result[position] = {
            goals: per90((m) => m.goals),
            assists: per90((m) => m.assists),
            saves: per90((m) => m.saves),
            yellowCards: per90((m) => m.yellowCards),
            redCards: per90((m) => m.redCards),
            defensiveActions: per90((m) => m.tackles + m.blocks + m.interceptions),
        }
    }

    return result
}

const toLine = (m: StoredMatch): MatchLine => ({
    minutes: m.minutes,
    goals: m.goals,
    assists: m.assists,
    saves: m.saves,
    yellowCards: m.yellowCards,
    redCards: m.redCards,
    defensiveActions: m.tackles + m.blocks + m.interceptions,
})

export interface BuiltInput {
    playerId: string
    teamId: string
    input: PlayerInput
}

export interface PreparedEvent {
    cutoff: Date
    strengths: TeamStrengths
    /** Finished fixtures before the cutoff, newest first. */
    finished: DatasetFixture[]
    /** Player lines before the cutoff. */
    before: StoredMatch[]
    priors: Record<Position, PositionPrior>
    byPlayer: Map<string, StoredMatch[]>
    eventFixtures: DatasetFixture[]
}

/**
 * What is known before the first kickoff of an event, shared by every model. `prepared` is null when the event
 * has no fixtures; `event` is null when `'next'` cannot be resolved.
 */
export function prepareEvent(
    data: ForecastDataset,
    event: number | 'next',
): { event: number | null; prepared: PreparedEvent | null } {
    const eventId =
        event === 'next'
            ? (data.events.find((e) => e.isNext)?.id ??
              [...data.events].filter((e) => !e.finished).sort((a, b) => a.id - b.id)[0]?.id ??
              null)
            : event

    if (eventId === null) return { event: null, prepared: null }

    const eventFixtures = data.fixtures.filter((f) => f.fplEvent === eventId)

    if (eventFixtures.length === 0) return { event: eventId, prepared: null }

    const cutoff = new Date(Math.min(...eventFixtures.map((f) => f.kickoff.getTime())))
    const finished = data.fixtures
        .filter(
            (f) =>
                f.kickoff < cutoff && FINISHED.has(f.status) && f.homeGoals !== null && f.awayGoals !== null,
        )
        .sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime())
    const strengths = computeTeamStrengths(
        finished.map(
            (f): FinishedMatch => ({
                kickoff: f.kickoff,
                homeTeamId: f.homeTeamId,
                awayTeamId: f.awayTeamId,
                homeGoals: f.homeGoals as number,
                awayGoals: f.awayGoals as number,
            }),
        ),
        cutoff,
    )
    const before = data.matches.filter((m) => m.kickoff < cutoff)
    const priors = positionPriors(before, cutoff)
    const byPlayer = new Map<string, StoredMatch[]>()

    for (const m of before) byPlayer.set(m.playerId, [...(byPlayer.get(m.playerId) ?? []), m])

    return {
        event: eventId,
        prepared: { cutoff, strengths, finished, before, priors, byPlayer, eventFixtures },
    }
}

/**
 * Model inputs for every FPL-mapped player for one event, using only what was known before the event's
 * first kickoff. With `useAvailability` (forecasting the upcoming event) the player's current FPL club and
 * availability are used; without it (backtesting) the club is the one of the latest match before the cutoff.
 */
export function buildInputsForEvent(
    data: ForecastDataset,
    event: number | 'next',
    opts: { useAvailability: boolean },
): { event: number | null; cutoff: Date | null; inputs: BuiltInput[] } {
    const { event: eventId, prepared } = prepareEvent(data, event)

    if (!prepared) return { event: eventId, cutoff: null, inputs: [] }

    const { cutoff, strengths, finished, priors, byPlayer, eventFixtures } = prepared

    const inputs: BuiltInput[] = []

    for (const player of data.players) {
        const lines = (byPlayer.get(player.playerId) ?? []).sort(
            (a, b) => b.kickoff.getTime() - a.kickoff.getTime(),
        )
        const teamId = opts.useAvailability
            ? (player.currentTeamId ?? lines[0]?.teamId)
            : (lines[0]?.teamId ?? player.currentTeamId)

        if (!teamId) continue

        const minutesByFixture = new Map(lines.map((l) => [l.fixtureId, l.minutes]))
        const teamMatches = finished
            .filter((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
            .slice(0, TEAM_MATCHES)
        const baseline = strengths.leagueGoalsPerTeam * (strengths.attack.get(teamId) ?? 1)
        const fixtures: FixtureContext[] = eventFixtures
            .filter((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
            .map((f) => {
                const isHome = f.homeTeamId === teamId
                const goals = expectedGoals(strengths, teamId, isHome ? f.awayTeamId : f.homeTeamId, isHome)

                return {
                    isHome,
                    teamGoalsFor: goals.for,
                    teamGoalsAgainst: goals.against,
                    teamBaselineGoals: baseline,
                }
            })

        inputs.push({
            playerId: player.playerId,
            teamId,
            input: {
                position: player.position,
                appearances: lines
                    .filter((l) => l.minutes > 0)
                    .slice(0, MAX_APPEARANCES)
                    .map(toLine),
                teamMatchMinutes: teamMatches.map((f) => minutesByFixture.get(f.fixtureId) ?? 0),
                availability: opts.useAvailability
                    ? availabilityFactor(data.availability.get(player.playerId))
                    : 1,
                fixtures,
                prior: priors[player.position],
            },
        })
    }

    return { event: eventId, cutoff, inputs }
}
