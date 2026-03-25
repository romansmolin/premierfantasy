import type { PlayerPosition } from '@/entities/players'

import { fetchGameweekPlayerData } from '../lib/match-data-fetcher'
import { calculatePoints } from '../lib/points-calculator'

import type { IScoringService } from './scoring.service.interface'
import type { IFantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository.interface'
import type { IGameweekRepository } from '@/server/gameweek/repository/gameweek.repository.interface'
import type { IPlayerGameweekStatsRepository } from '@/server/player-gameweek-stats/repository/player-gameweek-stats.repository.interface'

export class ScoringService implements IScoringService {
    private readonly gameweekRepository: IGameweekRepository
    private readonly playerGameweekStatsRepository: IPlayerGameweekStatsRepository
    private readonly fantasyTeamRepository: IFantasyTeamRepository

    constructor(
        gameweekRepository: IGameweekRepository,
        playerGameweekStatsRepository: IPlayerGameweekStatsRepository,
        fantasyTeamRepository: IFantasyTeamRepository,
    ) {
        this.gameweekRepository = gameweekRepository
        this.playerGameweekStatsRepository = playerGameweekStatsRepository
        this.fantasyTeamRepository = fantasyTeamRepository
    }

    async calculateGameweek(gameweekId: string, season: number, leagueId: number): Promise<void> {
        const gameweek = await this.gameweekRepository.findById(gameweekId)

        if (!gameweek) {
            throw new Error(`Gameweek with id ${gameweekId} not found`)
        }

        // Step 1: Fetch match data from API-Football
        const matchPlayerData = await fetchGameweekPlayerData(season, leagueId, gameweek.number)

        // Step 2: Look up internal player records by external IDs
        const externalIds = matchPlayerData.map((d) => d.playerExternalId)
        const playerLookups = await this.playerGameweekStatsRepository.findPlayersByExternalIds(externalIds)
        const externalIdToPlayer = new Map(playerLookups.map((p) => [p.externalId, p]))

        // Step 3: Calculate points and write player stats
        const statsRows = []

        for (const matchData of matchPlayerData) {
            const player = externalIdToPlayer.get(matchData.playerExternalId)

            if (!player) continue

            const totalPoints = calculatePoints({
                position: player.position as PlayerPosition,
                minutesPlayed: matchData.minutesPlayed,
                goals: matchData.goals,
                assists: matchData.assists,
                cleanSheet: matchData.cleanSheet,
                saves: matchData.saves,
                penaltySaved: matchData.penaltySaved,
                penaltyMissed: matchData.penaltyMissed,
                goalsConceded: matchData.goalsConceded,
                yellowCards: matchData.yellowCards,
                redCards: matchData.redCards,
                ownGoals: matchData.ownGoals,
            })

            statsRows.push({
                playerId: player.id,
                gameweekId,
                minutesPlayed: matchData.minutesPlayed,
                goals: matchData.goals,
                assists: matchData.assists,
                cleanSheet: matchData.cleanSheet,
                saves: matchData.saves,
                penaltySaved: matchData.penaltySaved,
                penaltyMissed: matchData.penaltyMissed,
                goalsConceded: matchData.goalsConceded,
                yellowCards: matchData.yellowCards,
                redCards: matchData.redCards,
                ownGoals: matchData.ownGoals,
                totalPoints,
            })
        }

        await this.playerGameweekStatsRepository.upsertMany(statsRows)

        // Step 4: Calculate fantasy team points
        const allTeams = await this.fantasyTeamRepository.findAll()

        // Build a lookup of player points for this gameweek
        const playerPointsMap = new Map(statsRows.map((row) => [row.playerId, row.totalPoints]))

        for (const team of allTeams) {
            const squadPlayers = await this.fantasyTeamRepository.getSquadPlayers(team.id)
            let teamPoints = 0

            for (const squadPlayer of squadPlayers) {
                // Look up internal player ID by externalId
                const internalPlayer = externalIdToPlayer.get(squadPlayer.externalId)

                if (internalPlayer) {
                    teamPoints += playerPointsMap.get(internalPlayer.id) ?? 0
                }
            }

            await this.playerGameweekStatsRepository.upsertGameweekPoints(team.id, gameweekId, teamPoints)
        }

        // Step 5: Mark gameweek as finished
        await this.gameweekRepository.setFinished(gameweekId)
    }
}
