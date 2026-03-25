import type { PlayerPosition } from '@/entities/players'

export interface LivePlayerPoints {
    playerExternalId: number
    name: string
    position: PlayerPosition
    minutesPlayed: number
    currentPoints: number
    events: { type: string; minute: number; points: number }[]
    isPlaying: boolean
}

export interface LiveFixtureResult {
    fixtureId: number
    homeTeam: string
    awayTeam: string
    score: string
    status: 'NS' | '1H' | 'HT' | '2H' | 'FT'
    players: LivePlayerPoints[]
}

export interface LiveTeamPoints {
    fantasyTeamId: string
    gameweekId: string
    totalLivePoints: number
    players: LivePlayerPoints[]
    fixtures: { fixtureId: number; homeTeam: string; awayTeam: string; score: string; status: string }[]
}
