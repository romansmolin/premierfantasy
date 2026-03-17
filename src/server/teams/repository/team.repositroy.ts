import type { IApiFootballResponse, ITeamResponse, ISquadResponse, ITeamStatistics } from '@/entities/team'

import { HttpClient } from '@/shared/api/http-client'
import { getEnv } from '@/shared/utils/get-env'

import type { ITeamsRepository } from './team.repository.interface'

export class TeamRepository implements ITeamsRepository {
    private readonly httpClient: HttpClient
    private readonly footballApiKey: string

    constructor() {
        this.httpClient = new HttpClient(getEnv('FOOTBAL_API_BASE_URL'))
        this.footballApiKey = getEnv('FOOTBAL_API_KEY')
    }

    async getAllTeams(leagueId: number, season: number): Promise<IApiFootballResponse<ITeamResponse[]>> {
        return this.httpClient.get<IApiFootballResponse<ITeamResponse[]>>('/teams', {
            headers: { 'x-apisports-key': this.footballApiKey },
            params: { league: leagueId, season },
        })
    }

    async getTeamById(teamId: number): Promise<IApiFootballResponse<ITeamResponse[]>> {
        return this.httpClient.get<IApiFootballResponse<ITeamResponse[]>>('/teams', {
            headers: { 'x-apisports-key': this.footballApiKey },
            params: { id: teamId },
        })
    }

    async getTeamPlayers(teamId: number): Promise<IApiFootballResponse<ISquadResponse[]>> {
        return this.httpClient.get<IApiFootballResponse<ISquadResponse[]>>('/players/squads', {
            headers: { 'x-apisports-key': this.footballApiKey },
            params: { team: teamId },
        })
    }

    async getTeamStatistics(
        teamId: number,
        leagueId: number,
        season: number,
    ): Promise<IApiFootballResponse<ITeamStatistics>> {
        return this.httpClient.get<IApiFootballResponse<ITeamStatistics>>('/teams/statistics', {
            headers: { 'x-apisports-key': this.footballApiKey },
            params: { team: teamId, league: leagueId, season },
        })
    }
}
