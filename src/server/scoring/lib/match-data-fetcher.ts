import { apiFootballClient } from '@/shared/api/api-football-client'

export interface MatchPlayerData {
    playerExternalId: number
    minutesPlayed: number
    goals: number
    assists: number
    saves: number
    penaltySaved: number
    penaltyMissed: number
    goalsConceded: number
    yellowCards: number
    redCards: number
    ownGoals: number
    cleanSheet: boolean
}

interface FixtureResponse {
    fixture: { id: number }
    teams: { home: { id: number }; away: { id: number } }
    goals: { home: number; away: number }
}

interface PlayerStatsEntry {
    player: { id: number }
    statistics: {
        games: { minutes: number | null }
        goals: { total: number | null; assists: number | null; conceded: number | null }
        penalty: { saved: number | null; missed: number | null }
        cards: { yellow: number | null; red: number | null }
    }[]
}

interface PlayerStatsResponse {
    team: { id: number }
    players: PlayerStatsEntry[]
}

interface EventResponse {
    type: string
    detail: string
    player: { id: number }
}

interface CleanSheetMap {
    [teamId: number]: boolean
}

function buildCleanSheetMap(fixtures: FixtureResponse[]): CleanSheetMap {
    const map: CleanSheetMap = {}

    for (const fixture of fixtures) {
        map[fixture.teams.home.id] = fixture.goals.away === 0
        map[fixture.teams.away.id] = fixture.goals.home === 0
    }

    return map
}

function countOwnGoals(events: EventResponse[]): Map<number, number> {
    const ownGoalCounts = new Map<number, number>()

    for (const event of events) {
        if (event.type === 'Goal' && event.detail === 'Own Goal') {
            const current = ownGoalCounts.get(event.player.id) ?? 0

            ownGoalCounts.set(event.player.id, current + 1)
        }
    }

    return ownGoalCounts
}

export async function fetchGameweekPlayerData(
    season: number,
    leagueId: number,
    gameweekNumber: number,
): Promise<MatchPlayerData[]> {
    const fixtures = await apiFootballClient.get<FixtureResponse[]>('/fixtures', {
        league: leagueId,
        season,
        round: `Regular Season - ${gameweekNumber}`,
    })

    const cleanSheetMap = buildCleanSheetMap(fixtures)
    const fixtureIds = fixtures.map((f) => f.fixture.id)

    const [allPlayerStats, allEvents] = await Promise.all([
        Promise.all(
            fixtureIds.map((fixtureId) =>
                apiFootballClient.get<PlayerStatsResponse[]>('/fixtures/players', { fixture: fixtureId }),
            ),
        ),
        Promise.all(
            fixtureIds.map((fixtureId) =>
                apiFootballClient.get<EventResponse[]>('/fixtures/events', { fixture: fixtureId }),
            ),
        ),
    ])

    const ownGoalsByFixture = allEvents.map((events) => countOwnGoals(events))

    const result: MatchPlayerData[] = []

    for (let i = 0; i < fixtureIds.length; i++) {
        const fixturePlayerStats = allPlayerStats[i]
        const fixtureOwnGoals = ownGoalsByFixture[i]

        for (const teamStats of fixturePlayerStats) {
            const teamId = teamStats.team.id
            const teamCleanSheet = cleanSheetMap[teamId] ?? false

            for (const playerEntry of teamStats.players) {
                const stat = playerEntry.statistics[0]

                if (!stat) continue

                const minutesPlayed = stat.games.minutes ?? 0

                if (minutesPlayed === 0) continue

                const playerOwnGoals = fixtureOwnGoals.get(playerEntry.player.id) ?? 0

                result.push({
                    playerExternalId: playerEntry.player.id,
                    minutesPlayed,
                    goals: stat.goals.total ?? 0,
                    assists: stat.goals.assists ?? 0,
                    saves: 0,
                    penaltySaved: stat.penalty.saved ?? 0,
                    penaltyMissed: stat.penalty.missed ?? 0,
                    goalsConceded: stat.goals.conceded ?? 0,
                    yellowCards: stat.cards.yellow ?? 0,
                    redCards: stat.cards.red ?? 0,
                    ownGoals: playerOwnGoals,
                    cleanSheet: teamCleanSheet,
                })
            }
        }
    }

    return result
}
