import type {
    ICreateFantasyTeam,
    ICreateTransfer,
    IFantasyTeam,
    ITransferInfo,
} from '@/entities/fantasy-team/model/fantasy-team.types'
import type { PlayerPosition } from '@/entities/players'

import type { SquadPlayerRow, SquadPlayerWithStats } from '../repository/fantasy-team.repository.interface'

export interface SaveSquadPlayer {
    id: number
    name: string
    position: PlayerPosition
    price: number
    teamId: number
}

export interface IFantasyTeamService {
    getFantasyTeam(id: string): Promise<IFantasyTeam | null>
    getFantasyTeamsByUser(userId: string): Promise<IFantasyTeam[]>
    getAllFantasyTeams(): Promise<IFantasyTeam[]>
    createFantasyTeam(data: ICreateFantasyTeam): Promise<IFantasyTeam>
    updateFantasyTeam(id: string, data: Partial<IFantasyTeam>): Promise<IFantasyTeam>
    deleteFantasyTeam(id: string): Promise<void>
    saveSquad(fantasyTeamId: string, players: SaveSquadPlayer[]): Promise<void>
    getSquad(fantasyTeamId: string): Promise<SquadPlayerRow[]>
    getSquadWithGameweekStats(fantasyTeamId: string, gameweekNumber: number): Promise<SquadPlayerWithStats[]>
    getTransferInfo(fantasyTeamId: string): Promise<ITransferInfo>
    makeTransfer(fantasyTeamId: string, transfers: ICreateTransfer[]): Promise<void>
}
