import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlayerPosition } from '@/entities/players/model/player.types'

import type { DemoConfig } from '@/shared/config/demo'

import { generateDemoGameweekScore } from '../lib/demo-score'

import { DemoCompetitionService } from './demo-competition.service'

import type { DemoPoolPlayer } from '../lib/demo-roster'
import type {
    IDemoCompetitionRow,
    IDemoRepository,
    IDemoTeamRow,
    IGameweekRow,
} from '../repository/demo.repository.interface'

const CONFIG: DemoConfig = { enabled: true, targetParticipantCount: 10 }

const competitionRow = (overrides: Partial<IDemoCompetitionRow> = {}): IDemoCompetitionRow => ({
    id: 'comp-1',
    name: 'PL GW1-5',
    status: 'active',
    startGameweek: 1,
    endGameweek: 5,
    demoScoringFinalizedAt: null,
    leagueSeasonId: 'season-1',
    leagueId: 'league-1',
    seasonYear: 2026,
    ...overrides,
})

const gameweekRow = (number: number, overrides: Partial<IGameweekRow> = {}): IGameweekRow => ({
    id: `gw-${number}`,
    number,
    endDate: new Date(Date.now() - 86_400_000),
    isFinished: true,
    ...overrides,
})

/** Pool wide enough for buildDemoSquad: 20 per position across 10 clubs at 5m each. */
const buildPool = (): DemoPoolPlayer[] => {
    const positions: PlayerPosition[] = ['GK', 'DEF', 'MID', 'FWD']

    return positions.flatMap((position) =>
        Array.from({ length: 20 }, (_, i) => ({
            id: `${position}-${i}`,
            externalId: 1000 + positions.indexOf(position) * 100 + i,
            name: `${position} ${i}`,
            position,
            teamExternalId: i % 10,
            price: 5,
        })),
    )
}

const makeDeps = (config: DemoConfig = CONFIG) => {
    let userSeq = 0

    const repository = {
        findCompetition: vi.fn().mockResolvedValue(competitionRow()),
        findCompetitionsForProcessing: vi.fn().mockResolvedValue([]),
        countRealTeams: vi.fn().mockResolvedValue(1),
        findDemoTeams: vi.fn().mockResolvedValue([] as IDemoTeamRow[]),
        ensureDemoUser: vi.fn().mockImplementation(async (email: string) => ({
            id: `user-${email}-${userSeq++ >= 0 ? '' : ''}`.replace(/[^a-z0-9-]/g, ''),
        })),
        ensureMembership: vi.fn().mockResolvedValue(undefined),
        findTeamByUserAndCompetition: vi.fn().mockResolvedValue(null),
        createDemoTeamWithSquad: vi.fn().mockResolvedValue(undefined),
        loadPlayerPool: vi.fn().mockResolvedValue(buildPool()),
        findGameweeksInRange: vi.fn().mockResolvedValue([]),
        findExistingPointsKeys: vi.fn().mockResolvedValue(new Set<string>()),
        findPointsByKey: vi.fn().mockResolvedValue(new Map<string, number>()),
        updateGameweekPoints: vi.fn().mockImplementation(async (rows: unknown[]) => rows.length),
        insertGameweekPointsIfAbsent: vi.fn().mockImplementation(async (rows: unknown[]) => rows.length),
        deleteDemoPointsOutsideRange: vi.fn().mockResolvedValue(0),
        markDemoScoringFinalized: vi.fn().mockResolvedValue(undefined),
    }

    const service = new DemoCompetitionService(repository as unknown as IDemoRepository, config)

    return { service, repository }
}

describe('DemoCompetitionService.ensureDemoParticipants', () => {
    let deps: ReturnType<typeof makeDeps>

    beforeEach(() => {
        deps = makeDeps()
    })

    it('tops a competition with one real user up to the target size', async () => {
        deps.repository.countRealTeams.mockResolvedValue(1)

        const result = await deps.service.ensureDemoParticipants('comp-1')

        expect(result.created).toBe(9)
        expect(deps.repository.createDemoTeamWithSquad).toHaveBeenCalledTimes(9)
    })

    it('creates only the missing number when demos already exist', async () => {
        deps.repository.countRealTeams.mockResolvedValue(4)
        deps.repository.findDemoTeams.mockResolvedValue([
            { id: 't1', userId: 'u1', name: 'Baltic XI' },
            { id: 't2', userId: 'u2', name: 'Red Lions' },
        ])

        const result = await deps.service.ensureDemoParticipants('comp-1')

        expect(result.created).toBe(4)
    })

    it('creates nothing when the competition is already full', async () => {
        deps.repository.countRealTeams.mockResolvedValue(10)

        const result = await deps.service.ensureDemoParticipants('comp-1')

        expect(result.created).toBe(0)
        expect(deps.repository.createDemoTeamWithSquad).not.toHaveBeenCalled()
    })

    it('never removes demo teams when real users overfill the competition', async () => {
        deps.repository.countRealTeams.mockResolvedValue(9)
        deps.repository.findDemoTeams.mockResolvedValue(
            Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, userId: `u${i}`, name: `Demo ${i}` })),
        )

        const result = await deps.service.ensureDemoParticipants('comp-1')

        expect(result.created).toBe(0)
        expect(deps.repository.createDemoTeamWithSquad).not.toHaveBeenCalled()
    })

    it('every created team carries a full 11-player squad', async () => {
        deps.repository.countRealTeams.mockResolvedValue(8)

        await deps.service.ensureDemoParticipants('comp-1')

        for (const call of deps.repository.createDemoTeamWithSquad.mock.calls) {
            const { players, budgetLeft } = call[0] as {
                players: DemoPoolPlayer[]
                budgetLeft: number
            }

            expect(players).toHaveLength(11)
            expect(budgetLeft).toBeGreaterThanOrEqual(0)
        }
    })

    it('is idempotent — a second run after seeding creates nothing new', async () => {
        deps.repository.countRealTeams.mockResolvedValue(2)

        await deps.service.ensureDemoParticipants('comp-1')

        // Simulate the state the first run produced.
        deps.repository.findDemoTeams.mockResolvedValue(
            Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, userId: `u${i}`, name: `Demo ${i}` })),
        )
        deps.repository.createDemoTeamWithSquad.mockClear()

        const second = await deps.service.ensureDemoParticipants('comp-1')

        expect(second.created).toBe(0)
        expect(deps.repository.createDemoTeamWithSquad).not.toHaveBeenCalled()
    })

    it('skips a manager who already has a team even when counts disagree', async () => {
        deps.repository.countRealTeams.mockResolvedValue(9)
        deps.repository.findTeamByUserAndCompetition.mockResolvedValue({ id: 'existing' })

        const result = await deps.service.ensureDemoParticipants('comp-1')

        expect(result.created).toBe(0)
        expect(deps.repository.createDemoTeamWithSquad).not.toHaveBeenCalled()
    })

    it('does nothing when demo participants are disabled', async () => {
        const disabled = makeDeps({ enabled: false, targetParticipantCount: 10 })

        const result = await disabled.service.ensureDemoParticipants('comp-1')

        expect(result.created).toBe(0)
        expect(disabled.repository.loadPlayerPool).not.toHaveBeenCalled()
    })

    it('404s for an unknown competition', async () => {
        deps.repository.findCompetition.mockResolvedValue(null)

        await expect(deps.service.ensureDemoParticipants('ghost')).rejects.toMatchObject({
            statusCode: 404,
        })
    })
})

describe('DemoCompetitionService.updateDemoScores', () => {
    let deps: ReturnType<typeof makeDeps>

    const demoTeams: IDemoTeamRow[] = [
        { id: 'team-a', userId: 'u-a', name: 'Baltic XI' },
        { id: 'team-b', userId: 'u-b', name: 'Red Lions' },
    ]

    beforeEach(() => {
        deps = makeDeps()
        deps.repository.findDemoTeams.mockResolvedValue(demoTeams)
        deps.repository.findGameweeksInRange.mockResolvedValue([gameweekRow(1), gameweekRow(2)])
    })

    it('persists one row per demo team per elapsed gameweek', async () => {
        const result = await deps.service.updateDemoScores('comp-1')

        expect(result.rowsInserted).toBe(4)

        const rows = deps.repository.insertGameweekPointsIfAbsent.mock.calls[0][0] as {
            fantasyTeamId: string
            gameweekId: string
            points: number
        }[]

        expect(rows).toHaveLength(4)

        for (const row of rows) {
            expect(row.points).toBeGreaterThanOrEqual(12)
            expect(row.points).toBeLessThanOrEqual(92)
            expect(demoTeams.map((t) => t.id)).toContain(row.fantasyTeamId)
        }
    })

    it('gives different teams different score sequences', async () => {
        await deps.service.updateDemoScores('comp-1')

        const rows = deps.repository.insertGameweekPointsIfAbsent.mock.calls[0][0] as {
            fantasyTeamId: string
            points: number
        }[]

        const teamA = rows.filter((r) => r.fantasyTeamId === 'team-a').map((r) => r.points)
        const teamB = rows.filter((r) => r.fantasyTeamId === 'team-b').map((r) => r.points)

        expect(teamA).not.toEqual(teamB)
    })

    it('is deterministic — the same period always generates the same points', async () => {
        await deps.service.updateDemoScores('comp-1')

        const first = deps.repository.insertGameweekPointsIfAbsent.mock.calls[0][0]

        deps.repository.insertGameweekPointsIfAbsent.mockClear()
        await deps.service.updateDemoScores('comp-1')

        const second = deps.repository.insertGameweekPointsIfAbsent.mock.calls[0][0]

        expect(second).toEqual(first)
    })

    it('skips (team, gameweek) pairs that already have points — history is preserved', async () => {
        deps.repository.findExistingPointsKeys.mockResolvedValue(new Set(['team-a:gw-1']))

        const result = await deps.service.updateDemoScores('comp-1')

        expect(result.rowsInserted).toBe(3)

        const rows = deps.repository.insertGameweekPointsIfAbsent.mock.calls[0][0] as {
            fantasyTeamId: string
            gameweekId: string
        }[]

        expect(rows.some((r) => r.fantasyTeamId === 'team-a' && r.gameweekId === 'gw-1')).toBe(false)
    })

    it('ignores gameweeks that have not finished yet', async () => {
        deps.repository.findGameweeksInRange.mockResolvedValue([
            gameweekRow(1),
            gameweekRow(2, { isFinished: false, endDate: new Date(Date.now() + 86_400_000) }),
        ])

        const result = await deps.service.updateDemoScores('comp-1')

        expect(result.rowsInserted).toBe(2)
    })

    it('writes nothing for a competition whose demo scoring is finalized', async () => {
        deps.repository.findCompetition.mockResolvedValue(
            competitionRow({ status: 'completed', demoScoringFinalizedAt: new Date() }),
        )

        const result = await deps.service.updateDemoScores('comp-1')

        expect(result.rowsInserted).toBe(0)
        expect(deps.repository.insertGameweekPointsIfAbsent).not.toHaveBeenCalled()
    })

    it('only ever scores demo teams — real teams are outside its reach', async () => {
        await deps.service.updateDemoScores('comp-1')

        // The only team source is findDemoTeams (isDemo: true); assert nothing else supplied ids.
        const rows = deps.repository.insertGameweekPointsIfAbsent.mock.calls[0][0] as {
            fantasyTeamId: string
        }[]

        expect(new Set(rows.map((r) => r.fantasyTeamId))).toEqual(new Set(['team-a', 'team-b']))
    })
})

describe('DemoCompetitionService.processCompetitions (finalization)', () => {
    let deps: ReturnType<typeof makeDeps>

    const demoTeams: IDemoTeamRow[] = [{ id: 'team-a', userId: 'u-a', name: 'Baltic XI' }]

    beforeEach(() => {
        deps = makeDeps()
        deps.repository.countRealTeams.mockResolvedValue(10)
        deps.repository.findDemoTeams.mockResolvedValue(demoTeams)
    })

    it('finalizes a finished competition: fills remaining gameweeks, then locks it', async () => {
        const completed = competitionRow({ status: 'completed' })

        deps.repository.findCompetitionsForProcessing.mockResolvedValue([completed])
        deps.repository.findCompetition.mockResolvedValue(completed)
        // Final gameweek never got marked finished — finalization must score it anyway.
        deps.repository.findGameweeksInRange.mockResolvedValue([
            gameweekRow(5, { isFinished: false, endDate: new Date(Date.now() + 86_400_000) }),
        ])

        const result = await deps.service.processCompetitions()

        expect(result.finalized).toBe(1)
        expect(result.scoreRowsInserted).toBe(1)
        expect(deps.repository.markDemoScoringFinalized).toHaveBeenCalledWith('comp-1')
    })

    it('later cron runs leave a finalized competition untouched', async () => {
        deps.repository.findCompetitionsForProcessing.mockResolvedValue([])

        const result = await deps.service.processCompetitions()

        expect(result.processed).toBe(0)
        expect(deps.repository.insertGameweekPointsIfAbsent).not.toHaveBeenCalled()
        expect(deps.repository.markDemoScoringFinalized).not.toHaveBeenCalled()
    })

    it('scores active competitions and seeds upcoming ones on the same tick', async () => {
        const active = competitionRow({ id: 'comp-a', status: 'active' })
        const upcoming = competitionRow({ id: 'comp-b', status: 'upcoming' })

        deps.repository.findCompetitionsForProcessing.mockResolvedValue([active, upcoming])
        deps.repository.findCompetition.mockImplementation(async (id: string) =>
            id === 'comp-a' ? active : upcoming,
        )
        deps.repository.findGameweeksInRange.mockResolvedValue([gameweekRow(1)])

        const result = await deps.service.processCompetitions()

        expect(result.processed).toBe(2)
        // Only the active one is scored.
        expect(result.scoreRowsInserted).toBe(1)
        expect(result.finalized).toBe(0)
    })

    it('one broken competition does not stop the rest', async () => {
        const bad = competitionRow({ id: 'comp-bad' })
        const good = competitionRow({ id: 'comp-good' })

        deps.repository.findCompetitionsForProcessing.mockResolvedValue([bad, good])
        deps.repository.findCompetition.mockImplementation(async (id: string) => {
            if (id === 'comp-bad') throw new Error('boom')

            return good
        })
        deps.repository.findGameweeksInRange.mockResolvedValue([gameweekRow(1)])
        deps.repository.findDemoTeams.mockResolvedValue(demoTeams)

        const result = await deps.service.processCompetitions()

        expect(result.errors).toHaveLength(1)
        expect(result.scoreRowsInserted).toBe(1)
    })

    it('does nothing at all when disabled', async () => {
        const disabled = makeDeps({ enabled: false, targetParticipantCount: 10 })

        const result = await disabled.service.processCompetitions()

        expect(result.processed).toBe(0)
        expect(disabled.repository.findCompetitionsForProcessing).not.toHaveBeenCalled()
    })
})

describe('DemoCompetitionService.recalculateDemoScores', () => {
    let deps: ReturnType<typeof makeDeps>

    const demoTeams: IDemoTeamRow[] = [
        { id: 'team-a', userId: 'u-a', name: 'Baltic XI' },
        { id: 'team-b', userId: 'u-b', name: 'Red Lions' },
    ]

    beforeEach(() => {
        deps = makeDeps()
        deps.repository.findDemoTeams.mockResolvedValue(demoTeams)
        deps.repository.findGameweeksInRange.mockResolvedValue([gameweekRow(1), gameweekRow(2)])
    })

    it('fills every missing row when nothing has been scored yet', async () => {
        const result = await deps.service.recalculateDemoScores('comp-1')

        expect(result.inserted).toBe(4)
        expect(result.corrected).toBe(0)
        expect(result.unchanged).toBe(0)
    })

    it('is a no-op once every row already holds the deterministic value', async () => {
        const stored = new Map<string, number>()

        for (const team of demoTeams) {
            for (const gameweek of ['gw-1', 'gw-2']) {
                stored.set(`${team.id}:${gameweek}`, generateDemoGameweekScore(team.id, gameweek))
            }
        }

        deps.repository.findPointsByKey.mockResolvedValue(stored)

        const result = await deps.service.recalculateDemoScores('comp-1')

        expect(result.unchanged).toBe(4)
        expect(result.inserted).toBe(0)
        expect(result.corrected).toBe(0)
        expect(deps.repository.updateGameweekPoints).toHaveBeenCalledWith([])
    })

    it('repairs a row whose stored value has drifted', async () => {
        deps.repository.findPointsByKey.mockResolvedValue(new Map([['team-a:gw-1', 9999]]))

        const result = await deps.service.recalculateDemoScores('comp-1')

        expect(result.corrected).toBe(1)
        expect(result.inserted).toBe(3)

        const updates = deps.repository.updateGameweekPoints.mock.calls[0][0] as {
            fantasyTeamId: string
            gameweekId: string
            points: number
        }[]

        expect(updates).toEqual([
            {
                fantasyTeamId: 'team-a',
                gameweekId: 'gw-1',
                points: generateDemoGameweekScore('team-a', 'gw-1'),
            },
        ])
    })

    it('backfills a team seeded after the previous scoring run', async () => {
        const stored = new Map<string, number>()

        for (const gameweek of ['gw-1', 'gw-2']) {
            stored.set(`team-a:${gameweek}`, generateDemoGameweekScore('team-a', gameweek))
        }

        deps.repository.findPointsByKey.mockResolvedValue(stored)

        const result = await deps.service.recalculateDemoScores('comp-1')

        expect(result.unchanged).toBe(2)
        expect(result.inserted).toBe(2)
    })

    it('produces identical results when run twice', async () => {
        await deps.service.recalculateDemoScores('comp-1')

        const first = deps.repository.insertGameweekPointsIfAbsent.mock.calls[0][0]

        deps.repository.insertGameweekPointsIfAbsent.mockClear()
        await deps.service.recalculateDemoScores('comp-1')

        expect(deps.repository.insertGameweekPointsIfAbsent.mock.calls[0][0]).toEqual(first)
    })

    it('refuses to touch a finalized competition', async () => {
        deps.repository.findCompetition.mockResolvedValue(
            competitionRow({ status: 'completed', demoScoringFinalizedAt: new Date() }),
        )

        const result = await deps.service.recalculateDemoScores('comp-1')

        expect(result.skippedFinalized).toBe(true)
        expect(deps.repository.insertGameweekPointsIfAbsent).not.toHaveBeenCalled()
        expect(deps.repository.updateGameweekPoints).not.toHaveBeenCalled()
    })

    it('ignores gameweeks that have not elapsed', async () => {
        deps.repository.findGameweeksInRange.mockResolvedValue([
            gameweekRow(1),
            gameweekRow(2, { isFinished: false, endDate: new Date(Date.now() + 86_400_000) }),
        ])

        const result = await deps.service.recalculateDemoScores('comp-1')

        expect(result.gameweeksConsidered).toBe(1)
        expect(result.inserted).toBe(2)
    })

    it('never reads or writes real teams', async () => {
        await deps.service.recalculateDemoScores('comp-1')

        // findDemoTeams is the only team source, and it is scoped to isDemo: true.
        expect(deps.repository.findDemoTeams).toHaveBeenCalledWith('comp-1')
        expect(deps.repository.countRealTeams).not.toHaveBeenCalled()
    })

    it('prunes points stranded outside the competition window', async () => {
        deps.repository.deleteDemoPointsOutsideRange.mockResolvedValue(7)

        const result = await deps.service.recalculateDemoScores('comp-1')

        expect(result.pruned).toBe(7)
        expect(deps.repository.deleteDemoPointsOutsideRange).toHaveBeenCalledWith('comp-1', 1, 5)
    })

    it('never prunes a finalized competition', async () => {
        deps.repository.findCompetition.mockResolvedValue(
            competitionRow({ status: 'completed', demoScoringFinalizedAt: new Date() }),
        )

        await deps.service.recalculateDemoScores('comp-1')

        expect(deps.repository.deleteDemoPointsOutsideRange).not.toHaveBeenCalled()
    })

    it('404s for an unknown competition', async () => {
        deps.repository.findCompetition.mockResolvedValue(null)

        await expect(deps.service.recalculateDemoScores('ghost')).rejects.toMatchObject({
            statusCode: 404,
        })
    })

    it('does nothing when demo participants are disabled', async () => {
        const disabled = makeDeps({ enabled: false, targetParticipantCount: 10 })

        const result = await disabled.service.recalculateDemoScores('comp-1')

        expect(result.inserted).toBe(0)
        expect(disabled.repository.findDemoTeams).not.toHaveBeenCalled()
    })
})

describe('DemoCompetitionService.recalculateAllDemoScores', () => {
    it('aggregates across competitions and isolates failures', async () => {
        const deps = makeDeps()
        const good = competitionRow({ id: 'comp-good' })
        const bad = competitionRow({ id: 'comp-bad' })

        deps.repository.findCompetitionsForProcessing.mockResolvedValue([good, bad])
        deps.repository.findCompetition.mockImplementation(async (id: string) => {
            if (id === 'comp-bad') throw new Error('boom')

            return good
        })
        deps.repository.findDemoTeams.mockResolvedValue([{ id: 'team-a', userId: 'u-a', name: 'Baltic XI' }])
        deps.repository.findGameweeksInRange.mockResolvedValue([gameweekRow(1)])

        const result = await deps.service.recalculateAllDemoScores()

        expect(result.competitions).toBe(1)
        expect(result.inserted).toBe(1)
        expect(result.errors).toHaveLength(1)
    })

    it('counts finalized competitions as skipped rather than failing', async () => {
        const deps = makeDeps()
        const finalized = competitionRow({ status: 'completed', demoScoringFinalizedAt: new Date() })

        deps.repository.findCompetitionsForProcessing.mockResolvedValue([finalized])
        deps.repository.findCompetition.mockResolvedValue(finalized)

        const result = await deps.service.recalculateAllDemoScores()

        expect(result.skippedFinalized).toBe(1)
        expect(result.errors).toHaveLength(0)
    })
})
