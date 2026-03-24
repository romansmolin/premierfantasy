import type { ICreateFantasyTeam, IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'
import { BUDGET_TOTAL } from '@/entities/players'

import type { IFantasyTeamService, SaveSquadPlayer } from './fantasy-team.service.interface'
import type { IFantasyTeamRepository, SquadPlayerRow } from '../repository/fantasy-team.repository.interface'

export class FantasyTeamService implements IFantasyTeamService {
    private readonly fantasyTeamRepository

    constructor(fantasyTeamRepository: IFantasyTeamRepository) {
        this.fantasyTeamRepository = fantasyTeamRepository
    }

    async getFantasyTeam(id: string): Promise<IFantasyTeam | null> {
        return this.fantasyTeamRepository.findById(id)
    }

    async getFantasyTeamsByUser(userId: string): Promise<IFantasyTeam[]> {
        return this.fantasyTeamRepository.findByUserId(userId)
    }

    async getAllFantasyTeams(): Promise<IFantasyTeam[]> {
        return this.fantasyTeamRepository.findAll()
    }

    async createFantasyTeam(data: ICreateFantasyTeam): Promise<IFantasyTeam> {
        const existing = await this.fantasyTeamRepository.findByUserAndCompetition(
            data.userId,
            data.competitionId,
        )

        if (existing) throw new Error('User already has a team in this competition')

        return this.fantasyTeamRepository.create(data)
    }

    async updateFantasyTeam(id: string, data: Partial<IFantasyTeam>): Promise<IFantasyTeam> {
        return this.fantasyTeamRepository.update(id, data)
    }

    async deleteFantasyTeam(id: string): Promise<void> {
        return this.fantasyTeamRepository.delete(id)
    }

    async getSquad(fantasyTeamId: string): Promise<SquadPlayerRow[]> {
        return this.fantasyTeamRepository.getSquadPlayers(fantasyTeamId)
    }

    async saveSquad(fantasyTeamId: string, players: SaveSquadPlayer[]): Promise<void> {
        if (players.length !== 11) {
            throw new Error(`Squad must have exactly 11 players (got ${players.length})`)
        }

        const totalCost = players.reduce((sum, p) => sum + p.price, 0)

        if (totalCost > BUDGET_TOTAL) {
            throw new Error(`Squad cost (${totalCost}m) exceeds budget (${BUDGET_TOTAL}m)`)
        }

        await this.fantasyTeamRepository.saveSquadPlayers(
            fantasyTeamId,
            players.map((p) => ({
                playerId: p.id,
                name: p.name,
                position: p.position,
                purchasePrice: p.price,
                teamId: p.teamId,
            })),
        )
    }
}
