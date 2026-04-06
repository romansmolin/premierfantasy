import type { IPlayerDetails } from '@/entities/players/model/player-details.types'
import type { IApiFootballResponse, ITeamResponse, ISquadResponse, ITeamStatistics } from '@/entities/team'

export interface ITeamsRepository {
    getAllTeams(leagueId: number, season: number): Promise<IApiFootballResponse<ITeamResponse[]>>
    getTeamById(teamId: number): Promise<IApiFootballResponse<ITeamResponse[]>>
    getTeamPlayers(teamId: number): Promise<IApiFootballResponse<ISquadResponse[]>>
    getTeamStatistics(
        teamId: number,
        leagueId: number,
        season: number,
    ): Promise<IApiFootballResponse<ITeamStatistics>>
    getPlayerDetails(playerId: number, season: number): Promise<IApiFootballResponse<IPlayerDetails[]>>
}
