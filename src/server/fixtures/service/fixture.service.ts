import type { IFixtureService, ILeagueNextFixtures, ILeagueSeasonRef } from './fixture.service.interface'
import type { IApiFixture, IFixtureRepository } from '../repository/fixture.repository.interface'

/**
 * Fixture lists barely change minute to minute, and API-Football bills per call.
 * Results are cached per (league, season, count) so a dashboard full of league
 * cards costs one upstream call per league per TTL, not one per render.
 */
const CACHE_TTL_MS = 10 * 60 * 1000
const MAX_LEAGUES_PER_REQUEST = 20

interface CacheEntry {
    fixtures: IApiFixture[]
    expiresAt: number
}

export class FixtureService implements IFixtureService {
    private readonly fixtureRepository: IFixtureRepository
    private readonly cache = new Map<string, CacheEntry>()
    private readonly inFlight = new Map<string, Promise<IApiFixture[]>>()

    constructor(fixtureRepository: IFixtureRepository) {
        this.fixtureRepository = fixtureRepository
    }

    async getUpcoming(leagueExternalId: number, season: number, count: number): Promise<IApiFixture[]> {
        return this.load(leagueExternalId, season, count)
    }

    async getNextForLeagues(leagues: ILeagueSeasonRef[], perLeague: number): Promise<ILeagueNextFixtures[]> {
        const seen = new Set<number>()
        const unique = leagues
            .filter((league) => {
                if (seen.has(league.leagueExternalId)) return false

                seen.add(league.leagueExternalId)

                return true
            })
            .slice(0, MAX_LEAGUES_PER_REQUEST)

        return Promise.all(
            unique.map(async (league) => ({
                leagueExternalId: league.leagueExternalId,
                // One slow or failing league must not blank out every other card.
                fixtures: await this.load(league.leagueExternalId, league.season, perLeague).catch(() => []),
            })),
        )
    }

    private async load(leagueExternalId: number, season: number, count: number): Promise<IApiFixture[]> {
        const key = `${leagueExternalId}:${season}:${count}`
        const cached = this.cache.get(key)

        if (cached && cached.expiresAt > Date.now()) return cached.fixtures

        // Collapse concurrent misses for the same key into one upstream call.
        const pending = this.inFlight.get(key)

        if (pending) return pending

        const request = this.fixtureRepository
            .findNextByLeague(leagueExternalId, season, count)
            .then((fixtures) => {
                this.cache.set(key, { fixtures, expiresAt: Date.now() + CACHE_TTL_MS })

                return fixtures
            })
            .finally(() => {
                this.inFlight.delete(key)
            })

        this.inFlight.set(key, request)

        return request
    }
}
