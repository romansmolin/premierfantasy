import type { IPlayerDetails } from '@/entities/players/model/player-details.types'
import type { ITeamResponse, ISquadPlayer, ITeamStatistics } from '@/entities/team'

import type { ITeamsService } from './team.service.interface'
import type { ITeamsRepository } from '../repository/team.repository.interface'

export class TeamService implements ITeamsService {
    private readonly teamRepository: ITeamsRepository

    constructor(teamRepository: ITeamsRepository) {
        this.teamRepository = teamRepository
    }

    async getAllTeams(leagueId: number, season: number): Promise<ITeamResponse[]> {
        const result = await this.teamRepository.getAllTeams(leagueId, season)

        return result.response
    }

    async getTeamById(teamId: number): Promise<ITeamResponse | null> {
        const result = await this.teamRepository.getTeamById(teamId)

        return result.response[0] ?? null
    }

    async getTeamPlayers(teamId: number): Promise<ISquadPlayer[]> {
        const result = await this.teamRepository.getTeamPlayers(teamId)

        return result.response[0]?.players ?? []
    }

    async getTeamStatistics(
        teamId: number,
        leagueId: number,
        season: number,
    ): Promise<ITeamStatistics | null> {
        const result = await this.teamRepository.getTeamStatistics(teamId, leagueId, season)

        return result.response ?? null
    }

    async getPlayerDetails(playerId: number, season: number): Promise<IPlayerDetails | null> {
        const seasons = [season, season - 1]

        const results = await Promise.all(
            seasons.map((s) => this.teamRepository.getPlayerDetails(playerId, s)),
        )

        const primary = results[0].response?.[0]

        if (!primary) return null

        const allStats = results.flatMap((r) => r.response?.[0]?.statistics ?? [])

        return { player: primary.player, statistics: allStats }
    }
}
