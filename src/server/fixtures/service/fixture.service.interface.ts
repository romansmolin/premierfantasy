import type { IApiFixture } from '../repository/fixture.repository.interface'

export interface ILeagueSeasonRef {
    leagueExternalId: number
    season: number
}

export interface ILeagueNextFixtures {
    leagueExternalId: number
    fixtures: IApiFixture[]
}

export interface IFixtureService {
    getUpcoming(leagueExternalId: number, season: number, count: number): Promise<IApiFixture[]>
    /** One call for many leagues — what the dashboard's league cards need. */
    getNextForLeagues(leagues: ILeagueSeasonRef[], perLeague: number): Promise<ILeagueNextFixtures[]>
}
