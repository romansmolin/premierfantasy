import type { ICreateFantasyTeam, IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'

export interface SquadPlayerRow {
    externalId: number
    name: string
    position: 'GK' | 'DEF' | 'MID' | 'FWD'
    teamExternalId: number
    purchasePrice: number
}

export interface IFantasyTeamRepository {
    getSquadPlayers(fantasyTeamId: string): Promise<SquadPlayerRow[]>
    findById(id: string): Promise<IFantasyTeam | null>
    findByUserId(userId: string): Promise<IFantasyTeam[]>
    findByUserAndCompetition(userId: string, competitionId: string): Promise<IFantasyTeam | null>
    findAll(): Promise<IFantasyTeam[]>
    create(data: ICreateFantasyTeam): Promise<IFantasyTeam>
    update(id: string, data: Partial<IFantasyTeam>): Promise<IFantasyTeam>
    delete(id: string): Promise<void>
    saveSquadPlayers(
        fantasyTeamId: string,
        players: {
            playerId: number
            name: string
            position: 'GK' | 'DEF' | 'MID' | 'FWD'
            purchasePrice: number
            teamId: number
        }[],
    ): Promise<void>
}
