import type {
    ICompetition,
    ICompetitionState,
    ICreateCompetition,
    ILeaderboard,
} from '@/entities/competition/model/competition.types'

import type { ICompetitionBrowserRow } from '../repository/competition.repository.interface'

export interface ICompetitionService {
    getCompetition(id: string): Promise<ICompetition | null>
    getAllCompetitions(): Promise<ICompetition[]>
    getCompetitionsForBrowser(): Promise<ICompetitionBrowserRow[]>
    createCompetition(data: ICreateCompetition): Promise<ICompetition>
    updateCompetition(id: string, data: Partial<ICreateCompetition>): Promise<ICompetition>
    deleteCompetition(id: string): Promise<void>
    getLeaderboard(competitionId: string): Promise<ILeaderboard>
    getActiveCompetition(): Promise<ICompetition | null>
    getUpcomingCompetition(): Promise<ICompetition | null>
    getCompetitionState(userId: string): Promise<ICompetitionState>
    generateRollingCompetitions(totalGameweeks: number): Promise<void>
    transitionCompetitions(): Promise<void>
    ensureCompetitionsForActiveSeasons(): Promise<{
        created: number
        reactivated: number
        skipped: number
    }>
}
