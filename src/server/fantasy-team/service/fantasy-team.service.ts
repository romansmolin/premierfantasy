import type {
    ICreateFantasyTeam,
    ICreateTransfer,
    IFantasyTeam,
    ITransferInfo,
} from '@/entities/fantasy-team/model/fantasy-team.types'
import { BUDGET_TOTAL } from '@/entities/players'

import type { IFantasyTeamService, SaveSquadPlayer } from './fantasy-team.service.interface'
import type {
    IFantasyTeamRepository,
    SquadPlayerRow,
    SquadPlayerWithStats,
} from '../repository/fantasy-team.repository.interface'
import type { IGameweekRepository } from '@/server/gameweek/repository/gameweek.repository.interface'

export class FantasyTeamService implements IFantasyTeamService {
    private readonly fantasyTeamRepository
    private readonly gameweekRepository?: IGameweekRepository

    constructor(fantasyTeamRepository: IFantasyTeamRepository, gameweekRepository?: IGameweekRepository) {
        this.fantasyTeamRepository = fantasyTeamRepository
        this.gameweekRepository = gameweekRepository
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

    async getSquadWithGameweekStats(
        fantasyTeamId: string,
        gameweekNumber: number,
    ): Promise<SquadPlayerWithStats[]> {
        if (!this.gameweekRepository) {
            throw new Error('Gameweek repository not provided')
        }

        const gameweek = await this.gameweekRepository.findByNumber(gameweekNumber)

        if (!gameweek) throw new Error(`Gameweek ${gameweekNumber} not found`)

        return this.fantasyTeamRepository.getSquadWithGameweekStats(fantasyTeamId, gameweek.id)
    }

    async getTransferInfo(fantasyTeamId: string): Promise<ITransferInfo> {
        const team = await this.fantasyTeamRepository.findById(fantasyTeamId)

        if (!team) throw new Error('Team not found')

        const activeGameweek = this.gameweekRepository ? await this.gameweekRepository.findActive() : null

        const transfers = activeGameweek
            ? await this.fantasyTeamRepository.getTransfersForGameweek(fantasyTeamId, activeGameweek.id)
            : []

        const transfersMade = transfers.length
        const freeTransfers = team.freeTransfers ?? 1
        const pointsCost = Math.max(0, transfersMade - freeTransfers) * 4

        return {
            freeTransfers,
            deadline: activeGameweek?.startDate ?? null,
            transfersMade,
            pointsCost,
        }
    }

    async makeTransfer(fantasyTeamId: string, transfers: ICreateTransfer[]): Promise<void> {
        const team = await this.fantasyTeamRepository.findById(fantasyTeamId)

        if (!team) throw new Error('Team not found')

        if (!this.gameweekRepository) throw new Error('Gameweek repository not provided')

        const activeGameweek = await this.gameweekRepository.findActive()

        if (!activeGameweek) throw new Error('No active gameweek')

        const deadline = new Date(activeGameweek.startDate)

        if (new Date() > deadline) throw new Error('Transfer deadline has passed')

        const existingTransfers = await this.fantasyTeamRepository.getTransfersForGameweek(
            fantasyTeamId,
            activeGameweek.id,
        )

        let freeRemaining = Math.max(0, (team.freeTransfers ?? 1) - existingTransfers.length)

        for (const transfer of transfers) {
            const currentSquad = await this.fantasyTeamRepository.getSquadPlayers(fantasyTeamId)
            const playerOut = currentSquad.find((p) => p.externalId === transfer.playerOutId)

            if (!playerOut) throw new Error(`Player ${transfer.playerOutId} not in squad`)

            const isFree = freeRemaining > 0

            if (isFree) freeRemaining--

            const outPlayerInternalId = await this.fantasyTeamRepository.findPlayerInternalIdByExternalId(
                transfer.playerOutId,
            )

            if (!outPlayerInternalId) throw new Error(`Player record not found for ${transfer.playerOutId}`)

            await this.fantasyTeamRepository.swapSquadPlayer(fantasyTeamId, outPlayerInternalId, {
                externalId: transfer.playerInId,
                name: transfer.playerInName,
                position: transfer.playerInPosition,
                purchasePrice: transfer.playerInPrice,
                teamExternalId: transfer.playerInTeamId,
            })

            const inPlayerInternalId = await this.fantasyTeamRepository.findPlayerInternalIdByExternalId(
                transfer.playerInId,
            )

            if (!inPlayerInternalId) throw new Error(`Player record not found for ${transfer.playerInId}`)

            await this.fantasyTeamRepository.createTransfer({
                fantasyTeamId,
                gameweekId: activeGameweek.id,
                playerInId: inPlayerInternalId,
                playerOutId: outPlayerInternalId,
                isFree,
            })
        }
    }
}
