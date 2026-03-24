import type { ICreateFantasyTeam, IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'
import type { PlayerPosition } from '@/entities/players'

import type { SquadPlayerRow } from '../repository/fantasy-team.repository.interface'

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
}
