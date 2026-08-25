export type {
    ICompetition,
    ICompetitionBrowserRow,
    ICompetitionDetail,
    ICompetitionLeague,
    ICompetitionState,
    ICreateCompetition,
    ILeaderboard,
    ILeaderboardEntry,
    CompetitionStatus,
} from './model/competition.types'

export { competitionService } from './api/competition.service'
export { useCompetitionState } from './model/use-competition-state'
