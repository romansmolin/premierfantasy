import type {
    ICreateFantasyTeam,
    ICreateTransfer,
    IFantasyTeam,
    ITransferInfo,
} from '@/entities/fantasy-team/model/fantasy-team.types'
import { BUDGET_TOTAL } from '@/entities/players'

import { SEASON } from '@/shared/config/league'
import { Errors } from '@/shared/lib/http'

import type { IFantasyTeamService, SaveSquadPlayer } from './fantasy-team.service.interface'
import type {
    IFantasyTeamRepository,
    SquadPlayerRow,
    SquadPlayerWithStats,
} from '../repository/fantasy-team.repository.interface'
import type { IDemoCompetitionService } from '@/server/demo/service/demo-competition.service.interface'
import type { IGameweekRepository } from '@/server/gameweek/repository/gameweek.repository.interface'
import type { ILeagueMembershipService } from '@/server/league-membership/service/league-membership.service.interface'
import type { IPricingService } from '@/server/pricing/service/pricing.service.interface'

export class FantasyTeamService implements IFantasyTeamService {
    private readonly fantasyTeamRepository
    private readonly gameweekRepository?: IGameweekRepository
    private readonly pricingService?: IPricingService
    private readonly leagueMembershipService?: ILeagueMembershipService
    private readonly demoCompetitionService?: IDemoCompetitionService

    constructor(
        fantasyTeamRepository: IFantasyTeamRepository,
        gameweekRepository?: IGameweekRepository,
        pricingService?: IPricingService,
        leagueMembershipService?: ILeagueMembershipService,
        demoCompetitionService?: IDemoCompetitionService,
    ) {
        this.fantasyTeamRepository = fantasyTeamRepository
        this.gameweekRepository = gameweekRepository
        this.pricingService = pricingService
        this.leagueMembershipService = leagueMembershipService
        this.demoCompetitionService = demoCompetitionService
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

    /**
     * One team per user per competition. The unique index on (userId, competitionId)
     * is the real guard; this check turns the race-free case into a 409 the UI can act on.
     */
    async createFantasyTeam(data: ICreateFantasyTeam): Promise<IFantasyTeam> {
        const existing = await this.fantasyTeamRepository.findByUserAndCompetition(
            data.userId,
            data.competitionId,
        )

        if (existing) throw Errors.conflict('You already have a team in this competition', existing)

        // Validates the join window and records the league membership the team hangs off.
        if (this.leagueMembershipService) {
            await this.leagueMembershipService.joinCompetition(data.userId, data.competitionId)
        }

        const team = await this.fantasyTeamRepository.create(data)

        // Top the competition up with demo competitors so the new joiner never
        // lands in an empty room. Best-effort: seeding trouble must not fail the join.
        if (this.demoCompetitionService) {
            try {
                await this.demoCompetitionService.ensureDemoParticipants(data.competitionId)
            } catch (error) {
                console.error('Demo seeding after join failed:', error)
            }
        }

        return team
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
            throw Errors.unprocessable(`Squad must have exactly 11 players (got ${players.length})`)
        }

        const totalCost = players.reduce((sum, p) => sum + p.price, 0)

        if (totalCost > BUDGET_TOTAL) {
            throw Errors.unprocessable(`Squad cost (${totalCost}m) exceeds budget (${BUDGET_TOTAL}m)`)
        }

        if (this.pricingService) {
            const lookups = await Promise.all(
                players.map(async (p) => ({
                    externalId: p.id,
                    price: p.price,
                    internalId: await this.fantasyTeamRepository.findPlayerInternalIdByExternalId(p.id),
                })),
            )
            const validatable = lookups
                .filter((l): l is { externalId: number; price: number; internalId: string } =>
                    Boolean(l.internalId),
                )
                .map((l) => ({ playerId: l.internalId, price: l.price }))

            if (validatable.length > 0) {
                await this.pricingService.validateClientPrices(validatable, SEASON)
            }
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

        if (this.pricingService) {
            const lookups = await Promise.all(
                transfers.map(async (t) => ({
                    externalId: t.playerInId,
                    price: t.playerInPrice,
                    internalId: await this.fantasyTeamRepository.findPlayerInternalIdByExternalId(
                        t.playerInId,
                    ),
                })),
            )
            const validatable = lookups
                .filter((l): l is { externalId: number; price: number; internalId: string } =>
                    Boolean(l.internalId),
                )
                .map((l) => ({ playerId: l.internalId, price: l.price }))

            if (validatable.length > 0) {
                await this.pricingService.validateClientPrices(validatable, SEASON)
            }
        }

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
