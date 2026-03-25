import type { ICreateFantasyTeam, IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'

export interface SquadPlayerWithStats {
    externalId: number
    name: string
    position: 'GK' | 'DEF' | 'MID' | 'FWD'
    teamExternalId: number
    purchasePrice: number
    stats: {
        minutesPlayed: number
        goals: number
        assists: number
        cleanSheet: boolean
        saves: number
        penaltySaved: number
        penaltyMissed: number
        goalsConceded: number
        yellowCards: number
        redCards: number
        ownGoals: number
        totalPoints: number
    } | null
}

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
    getTeamsByCompetition(competitionId: string): Promise<{ id: string; players: { playerId: string }[] }[]>
    getSquadWithGameweekStats(fantasyTeamId: string, gameweekId: string): Promise<SquadPlayerWithStats[]>
}
