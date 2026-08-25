import type {
    IJoinLeagueResult,
    ILeagueParticipant,
    IMyLeague,
} from '@/entities/league/model/league-membership.types'

export interface ILeagueMembershipService {
    /** Enrols the user in the league's joinable season. Idempotent. */
    joinLeague(userId: string, leagueId: string): Promise<IJoinLeagueResult>
    getMyLeagues(userId: string): Promise<IMyLeague[]>
    /**
     * Validates the competition is still joinable and enrols the user in the league
     * behind it. Called whenever a squad is created, so a team can never exist
     * without the matching membership.
     */
    joinCompetition(userId: string, competitionId: string): Promise<void>
    getParticipants(leagueSeasonId: string): Promise<ILeagueParticipant[]>
}
