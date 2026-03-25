import type {
    ICompetition,
    ICreateCompetition,
    ILeaderboardEntry,
} from '@/entities/competition/model/competition.types'

export interface ICompetitionRepository {
    findById(id: string): Promise<ICompetition | null>
    findAll(): Promise<ICompetition[]>
    findActive(): Promise<ICompetition | null>
    findUpcoming(): Promise<ICompetition | null>
    findByGameweekRange(startGw: number, endGw: number): Promise<ICompetition | null>
    create(data: ICreateCompetition): Promise<ICompetition>
    update(id: string, data: Partial<ICreateCompetition>): Promise<ICompetition>
    delete(id: string): Promise<void>
    getLeaderboard(competitionId: string): Promise<ILeaderboardEntry[]>
    updateStatus(id: string, status: string): Promise<void>
}
