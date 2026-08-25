export type {
    IApiFootballResponse,
    ITeam,
    IVenue,
    ITeamResponse,
    ISquadPlayer,
    ISquadResponse,
    ITeamStatistics,
} from './model/team.types'

export { getAllTeams, getTeamsPlayersByTeamId } from './api/team.service'
export { useTeamsStore } from './model/team.storage'
export { useAllTeams } from './model/use-all-teams'
export { LeagueScopeProvider, useLeagueScope } from './model/league-scope.context'
export type { LeagueScope } from './model/league-scope.context'
export { useTeamPlayers } from './model/use-teams-players'
