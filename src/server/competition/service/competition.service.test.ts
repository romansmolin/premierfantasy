import { describe, expect, it, vi } from 'vitest'

import type { IGameweek } from '@/entities/gameweek/model/gameweek.types'

import { CompetitionService } from './competition.service'

import type { ICompetitionRepository } from '../repository/competition.repository.interface'
import type { IGameweekRepository } from '@/server/gameweek/repository/gameweek.repository.interface'
import type { ILeagueRepository } from '@/server/league/repository/league.repository.interface'

const gameweek = (number: number, overrides: Partial<IGameweek> = {}): IGameweek =>
    ({
        id: `gw-${number}`,
        number,
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-04'),
        isActive: false,
        isFinished: true,
        deadline: null,
        createdAt: new Date('2025-07-01'),
        ...overrides,
    }) as IGameweek

const season = {
    seasonId: 'season-1',
    leagueId: 'league-1',
    leagueName: 'Serie A',
    year: 2026,
    startDate: new Date('2026-08-01'),
    endDate: new Date('2027-05-31'),
}

const makeDeps = (gameweeks: IGameweek[]) => {
    const competitionRepository = {
        findActiveByLeagueSeasonId: vi.fn().mockResolvedValue(null),
        findLatestByLeagueSeasonId: vi.fn().mockResolvedValue(null),
        createForLeagueSeason: vi.fn().mockResolvedValue(undefined),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        updateJoinDeadline: vi.fn().mockResolvedValue(undefined),
        updateGameweekRange: vi.fn().mockResolvedValue(undefined),
    }

    const gameweekRepository = {
        findAll: vi.fn().mockResolvedValue(gameweeks),
    }

    const leagueRepository = {
        findInProgressSeasons: vi.fn().mockResolvedValue([season]),
        isLeagueByExternalId: vi.fn().mockResolvedValue(false),
    }

    const service = new CompetitionService(
        competitionRepository as unknown as ICompetitionRepository,
        undefined,
        gameweekRepository as unknown as IGameweekRepository,
        undefined,
        leagueRepository as unknown as ILeagueRepository,
    )

    return { service, competitionRepository, gameweekRepository, leagueRepository }
}

/** A full past season: 38 gameweeks, all finished — the off-season case. */
const finishedSeason = Array.from({ length: 38 }, (_, i) => gameweek(i + 1))

describe('ensureCompetitionsForActiveSeasons — window sizing', () => {
    it('creates a five-gameweek window, not a single stub gameweek', async () => {
        const deps = makeDeps(finishedSeason)

        await deps.service.ensureCompetitionsForActiveSeasons()

        const created = deps.competitionRepository.createForLeagueSeason.mock.calls[0][0]

        expect(created.endGameweek - created.startGameweek + 1).toBe(5)
    })

    it('anchors the window on the live gameweek when one is running', async () => {
        const gameweeks = finishedSeason.map((gw) =>
            gw.number === 12 ? gameweek(12, { isActive: true, isFinished: false }) : gw,
        )
        const deps = makeDeps(gameweeks)

        await deps.service.ensureCompetitionsForActiveSeasons()

        expect(deps.competitionRepository.createForLeagueSeason).toHaveBeenCalledWith(
            expect.objectContaining({ startGameweek: 12, endGameweek: 16 }),
        )
    })

    it('falls back to the first unfinished gameweek when none is flagged active', async () => {
        const gameweeks = finishedSeason.map((gw) =>
            gw.number >= 20 ? gameweek(gw.number, { isFinished: false }) : gw,
        )
        const deps = makeDeps(gameweeks)

        await deps.service.ensureCompetitionsForActiveSeasons()

        expect(deps.competitionRepository.createForLeagueSeason).toHaveBeenCalledWith(
            expect.objectContaining({ startGameweek: 20, endGameweek: 24 }),
        )
    })

    it('uses the closing window of the season when the calendar is entirely behind us', async () => {
        const deps = makeDeps(finishedSeason)

        await deps.service.ensureCompetitionsForActiveSeasons()

        expect(deps.competitionRepository.createForLeagueSeason).toHaveBeenCalledWith(
            expect.objectContaining({ startGameweek: 34, endGameweek: 38 }),
        )
    })

    it('never runs past the last gameweek of the calendar', async () => {
        const gameweeks = finishedSeason.map((gw) =>
            gw.number === 37 ? gameweek(37, { isActive: true, isFinished: false }) : gw,
        )
        const deps = makeDeps(gameweeks)

        await deps.service.ensureCompetitionsForActiveSeasons()

        expect(deps.competitionRepository.createForLeagueSeason).toHaveBeenCalledWith(
            expect.objectContaining({ startGameweek: 37, endGameweek: 38 }),
        )
    })
})

describe('ensureCompetitionsForActiveSeasons — repairing stub windows', () => {
    it('widens an existing single-gameweek competition in place', async () => {
        const deps = makeDeps(finishedSeason)

        deps.competitionRepository.findActiveByLeagueSeasonId.mockResolvedValue({
            id: 'comp-1',
            startGameweek: 1,
            endGameweek: 1,
        })

        const result = await deps.service.ensureCompetitionsForActiveSeasons()

        expect(result.widened).toBe(1)
        expect(deps.competitionRepository.updateGameweekRange).toHaveBeenCalledWith('comp-1', 34, 38)
        // Repaired in place — the competition, its teams and its points survive.
        expect(deps.competitionRepository.createForLeagueSeason).not.toHaveBeenCalled()
    })

    it('leaves a competition that already spans several gameweeks alone', async () => {
        const deps = makeDeps(finishedSeason)

        deps.competitionRepository.findActiveByLeagueSeasonId.mockResolvedValue({
            id: 'comp-1',
            startGameweek: 6,
            endGameweek: 10,
        })

        const result = await deps.service.ensureCompetitionsForActiveSeasons()

        expect(result.widened).toBe(0)
        expect(deps.competitionRepository.updateGameweekRange).not.toHaveBeenCalled()
    })

    it('also repairs a stub found on the reactivation path', async () => {
        const deps = makeDeps(finishedSeason)

        deps.competitionRepository.findLatestByLeagueSeasonId.mockResolvedValue({
            id: 'comp-old',
            startGameweek: 1,
            endGameweek: 1,
            joinDeadline: null,
        })

        const result = await deps.service.ensureCompetitionsForActiveSeasons()

        expect(result.reactivated).toBe(1)
        expect(result.widened).toBe(1)
        expect(deps.competitionRepository.updateGameweekRange).toHaveBeenCalledWith('comp-old', 34, 38)
    })

    it('is idempotent — a second pass widens nothing', async () => {
        const deps = makeDeps(finishedSeason)

        deps.competitionRepository.findActiveByLeagueSeasonId.mockResolvedValue({
            id: 'comp-1',
            startGameweek: 34,
            endGameweek: 38,
        })

        const result = await deps.service.ensureCompetitionsForActiveSeasons()

        expect(result.widened).toBe(0)
    })

    it('skips the Premier League, which the gameweek pipeline owns', async () => {
        const deps = makeDeps(finishedSeason)

        deps.leagueRepository.isLeagueByExternalId.mockResolvedValue(true)

        const result = await deps.service.ensureCompetitionsForActiveSeasons()

        expect(result).toMatchObject({ created: 0, widened: 0 })
        expect(deps.competitionRepository.createForLeagueSeason).not.toHaveBeenCalled()
    })
})
