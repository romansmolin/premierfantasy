import { describe, expect, it } from 'vitest'

import { buildInputsV2 } from './inputs'

import type { DatasetFixture, ForecastDataset, FplMatchRow, StoredMatch } from '../inputs'

const day = (d: number) => new Date(Date.UTC(2026, 7, d))

const fixture = (
    id: string,
    d: number,
    home: string,
    away: string,
    event: number | null,
    finished = true,
): DatasetFixture => ({
    fixtureId: id,
    kickoff: day(d),
    homeTeamId: home,
    awayTeamId: away,
    homeGoals: finished ? 1 : null,
    awayGoals: finished ? 1 : null,
    fplEvent: event,
    status: finished ? 'FT' : 'NS',
})

const line = (fixtureId: string, d: number, extra: Partial<StoredMatch> = {}): StoredMatch => ({
    kickoff: day(d),
    fixtureId,
    teamId: 'A',
    playerId: 'p1',
    minutes: 90,
    goals: 0,
    assists: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    tackles: 1,
    blocks: 1,
    interceptions: 1,
    isStarter: true,
    position: 'MID',
    ...extra,
})

const fplRow = (fixtureId: string, xg: number): FplMatchRow => ({
    fixtureId,
    event: 1,
    minutes: 90,
    started: true,
    goals: 0,
    assists: 0,
    xg,
    xa: 0.2,
    totalPoints: 2,
    wasHome: true,
})

const dataset = (overrides: Partial<ForecastDataset> = {}): ForecastDataset => ({
    matches: [line('f1', 1, { goals: 1 }), line('f2', 8)],
    fixtures: [
        fixture('f1', 1, 'A', 'B', 1),
        fixture('f2', 8, 'B', 'A', 2),
        fixture('f3', 15, 'A', 'C', 3, false),
    ],
    players: [{ playerId: 'p1', fplId: 101, position: 'MID', currentTeamId: 'A' }],
    fplPoints: new Map(),
    fplMatches: new Map([['p1', [fplRow('f1', 0.4)]]]),
    availability: new Map(),
    events: [
        { id: 2, finished: true, isNext: false, isCurrent: false },
        { id: 3, finished: false, isNext: true, isCurrent: false },
    ],
    ...overrides,
})

describe('buildInputsV2', () => {
    it('buildInputsV2 never uses a match at or after the cutoff', () => {
        const base = dataset()
        const later = dataset({
            fixtures: [...base.fixtures, fixture('f4', 22, 'A', 'D', 4)],
            matches: [...base.matches, line('f3', 15, { goals: 3 }), line('f4', 22, { goals: 5 })],
        })
        const a = buildInputsV2(base, 3, { useAvailability: false }).inputs[0].input
        const b = buildInputsV2(later, 3, { useAvailability: false }).inputs[0].input

        expect(b.appearances).toEqual(a.appearances)
        expect(b.teamMatches).toEqual(a.teamMatches)
        expect(a.appearances.map((x) => x.goals)).toEqual([0, 1])
    })

    it('horizon fixtures are the next five after cutoff', () => {
        const future = [4, 5, 6, 7, 8, 9].map((n) =>
            fixture(`g${n}`, 15 + n, n % 2 ? 'A' : 'D', n % 2 ? 'D' : 'A', n),
        )
        const other = fixture('x1', 16, 'C', 'D', 3, false)
        const result = buildInputsV2(dataset({ fixtures: [...dataset().fixtures, ...future, other] }), 3, {
            useAvailability: false,
        })
        const { fixtures } = result.inputs[0].input

        expect(fixtures.map((f) => f.fixtureId)).toEqual(['f3', 'g4', 'g5', 'g6', 'g7'])
        expect(fixtures[0]).toMatchObject({ opponentTeamId: 'C', isHome: true, kickoff: day(15) })
        expect(fixtures[1]).toMatchObject({ opponentTeamId: 'D', isHome: false })
        expect(result.strengths).not.toBeNull()
    })

    it('xg null for a match without an FPL row', () => {
        const { appearances } = buildInputsV2(dataset(), 3, { useAvailability: false }).inputs[0].input

        expect(appearances.map((a) => a.xg)).toEqual([null, 0.4])
        expect(appearances.map((a) => a.xa)).toEqual([null, 0.2])
    })

    it('team matches carry minutes and starts, newest first', () => {
        const matches = [line('f1', 1), line('f2', 8, { minutes: 25, isStarter: false })]
        const { teamMatches } = buildInputsV2(dataset({ matches }), 3, { useAvailability: false }).inputs[0]
            .input

        expect(teamMatches).toEqual([
            { minutes: 25, started: false },
            { minutes: 90, started: true },
        ])
    })
})
