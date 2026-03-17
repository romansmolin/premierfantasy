import type { ITeamResponse, ISquadPlayer, ITeamStatistics } from '@/entities/team'

export interface ITeamsService {
    getAllTeams(leagueId: number, season: number): Promise<ITeamResponse[]>
    getTeamById(teamId: number): Promise<ITeamResponse | null>
    getTeamPlayers(teamId: number): Promise<ISquadPlayer[]>
    getTeamStatistics(teamId: number, leagueId: number, season: number): Promise<ITeamStatistics | null>
}
