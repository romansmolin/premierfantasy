import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FixtureService } from './fixture.service'

import type { IApiFixture, IFixtureRepository } from '../repository/fixture.repository.interface'

const fixture = (id: number, leagueExternalId: number): IApiFixture => ({
    id,
    date: '2026-08-15T14:00:00.000Z',
    status: 'NS',
    homeTeam: { id: 33, name: 'Home', logo: '' },
    awayTeam: { id: 40, name: 'Away', logo: '' },
    goals: { home: null, away: null },
    round: 'Regular Season - 1',
    leagueExternalId,
})

const makeDeps = () => {
    const repository = {
        findNextByLeague: vi
            .fn<IFixtureRepository['findNextByLeague']>()
            .mockImplementation(async (leagueExternalId) => [fixture(1, leagueExternalId)]),
    }

    return { repository, service: new FixtureService(repository) }
}

describe('FixtureService.getNextForLeagues', () => {
    let deps: ReturnType<typeof makeDeps>

    beforeEach(() => {
        deps = makeDeps()
    })

    it('returns one entry per league, each with its own season', async () => {
        const result = await deps.service.getNextForLeagues(
            [
                { leagueExternalId: 39, season: 2026 },
                { leagueExternalId: 253, season: 2027 },
            ],
            1,
        )

        expect(result.map((r) => r.leagueExternalId)).toEqual([39, 253])
        expect(deps.repository.findNextByLeague).toHaveBeenCalledWith(39, 2026, 1)
        expect(deps.repository.findNextByLeague).toHaveBeenCalledWith(253, 2027, 1)
    })

    it('caches — a second call for the same league does not hit the API again', async () => {
        await deps.service.getNextForLeagues([{ leagueExternalId: 39, season: 2026 }], 1)
        await deps.service.getNextForLeagues([{ leagueExternalId: 39, season: 2026 }], 1)

        expect(deps.repository.findNextByLeague).toHaveBeenCalledOnce()
    })

    it('collapses concurrent misses for the same league into one API call', async () => {
        await Promise.all([
            deps.service.getNextForLeagues([{ leagueExternalId: 39, season: 2026 }], 1),
            deps.service.getNextForLeagues([{ leagueExternalId: 39, season: 2026 }], 1),
        ])

        expect(deps.repository.findNextByLeague).toHaveBeenCalledOnce()
    })

    it('de-duplicates repeated leagues within one request', async () => {
        await deps.service.getNextForLeagues(
            [
                { leagueExternalId: 39, season: 2026 },
                { leagueExternalId: 39, season: 2026 },
            ],
            1,
        )

        expect(deps.repository.findNextByLeague).toHaveBeenCalledOnce()
    })

    it('keeps other leagues alive when one upstream call fails', async () => {
        deps.repository.findNextByLeague.mockImplementation(async (leagueExternalId) => {
            if (leagueExternalId === 39) throw new Error('upstream down')

            return [fixture(2, leagueExternalId)]
        })

        const result = await deps.service.getNextForLeagues(
            [
                { leagueExternalId: 39, season: 2026 },
                { leagueExternalId: 140, season: 2026 },
            ],
            1,
        )

        expect(result.find((r) => r.leagueExternalId === 39)?.fixtures).toEqual([])
        expect(result.find((r) => r.leagueExternalId === 140)?.fixtures).toHaveLength(1)
    })

    it('does not cache a failed lookup', async () => {
        deps.repository.findNextByLeague.mockRejectedValueOnce(new Error('flaky'))

        await deps.service.getNextForLeagues([{ leagueExternalId: 39, season: 2026 }], 1)

        const retry = await deps.service.getNextForLeagues([{ leagueExternalId: 39, season: 2026 }], 1)

        expect(retry[0].fixtures).toHaveLength(1)
        expect(deps.repository.findNextByLeague).toHaveBeenCalledTimes(2)
    })

    it('caps how many leagues one request can fan out to', async () => {
        const leagues = Array.from({ length: 30 }, (_, i) => ({
            leagueExternalId: i + 1,
            season: 2026,
        }))

        const result = await deps.service.getNextForLeagues(leagues, 1)

        expect(result).toHaveLength(20)
    })
})
