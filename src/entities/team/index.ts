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
export { useTeamPlayers } from './model/use-teams-players'
