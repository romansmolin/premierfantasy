import type { ICreateFantasyTeam, IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'
import type { SelectedPlayer } from '@/entities/players'
import { BUDGET_TOTAL, validateSquadComplete } from '@/entities/players'

import type { IFantasyTeamService } from './fantasy-team.service.interface'
import type { IFantasyTeamRepository } from '../repository/fantasy-team.repository.interface'

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

    async saveSquad(fantasyTeamId: string, players: SelectedPlayer[]): Promise<void> {
        const squadValidation = validateSquadComplete(players)

        if (!squadValidation.valid) {
            throw new Error(squadValidation.reason)
        }

        const totalCost = players.reduce((sum, p) => sum + p.price, 0)

        if (totalCost > BUDGET_TOTAL) {
            throw new Error(`Squad cost (${totalCost}m) exceeds budget (${BUDGET_TOTAL}m)`)
        }

        await this.fantasyTeamRepository.saveSquadPlayers(
            fantasyTeamId,
            players.map((p) => ({
                playerId: p.id,
                position: p.position,
                purchasePrice: p.price,
            })),
        )
    }
}
