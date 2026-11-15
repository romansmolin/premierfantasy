import type { ApiFootballHttp } from '@/shared/api/api-football-http'

import { mapMatchPosition, mapPlayerMatchStats } from '../lib/match-stats.mapper'

import type { IMatchStatsSyncService } from './match-stats-sync.service.interface'
import type { ApiFixturePlayers, PlayerMatchStatsRow } from '../lib/match-stats.types'
import type {
    FixtureRef,
    IMatchDataRepository,
    NewPlayer,
} from '../repository/match-data.repository.interface'
import type { JobOutcome } from '@/server/sync/lib/job.types'
import type { RequestBudget } from '@/server/sync/lib/request-budget'

const FIXTURES_PER_SEASON_LIMIT = 1000

type Counters = Record<
    | 'fixtures'
    | 'rows'
    | 'emptyResponses'
    | 'createdPlayers'
    | 'skippedUnknownTeam'
    | 'skippedNoPosition'
    | 'skippedNoStats',
    number
>

export class MatchStatsSyncService implements IMatchStatsSyncService {
    private readonly repo: IMatchDataRepository
    private readonly http: Pick<ApiFootballHttp, 'get'>

    constructor(repo: IMatchDataRepository, http: Pick<ApiFootballHttp, 'get'>) {
        this.repo = repo
        this.http = http
    }

    async syncMatchStats(seasons: number[], budget: RequestBudget): Promise<JobOutcome> {
        const stats: Counters = {
            fixtures: 0,
            rows: 0,
            emptyResponses: 0,
            createdPlayers: 0,
            skippedUnknownTeam: 0,
            skippedNoPosition: 0,
            skippedNoStats: 0,
        }
        let dailyRemaining: number | null = null

        for (const season of seasons) {
            const fixtures = await this.repo.findFixturesNeedingStats(season, FIXTURES_PER_SEASON_LIMIT)

            for (const fixture of fixtures) {
                if (!budget.take(dailyRemaining)) return { status: 'PARTIAL', stats }

                const response = await this.http.get<ApiFixturePlayers[]>('/fixtures/players', {
                    fixture: fixture.externalId,
                })

                dailyRemaining = response.dailyRemaining

                if (!Array.isArray(response.data) || response.data.length === 0) {
                    await this.repo.incrementStatsAttempts(fixture.id)
                    stats.emptyResponses += 1

                    continue
                }

                await this.saveFixture(fixture, response.data, stats)
                stats.fixtures += 1
            }
        }

        return { status: 'OK', stats }
    }

    private async saveFixture(
        fixture: FixtureRef,
        blocks: ApiFixturePlayers[],
        stats: Counters,
    ): Promise<void> {
        const teamIds = await this.repo.findTeamIdsByExternalIds(blocks.map((block) => block.team.id))
        const known = await this.repo.findPlayersByExternalIds(
            blocks.flatMap((block) => block.players.map((entry) => entry.player.id)),
        )
        const newcomers = new Map<number, NewPlayer>()

        for (const block of blocks) {
            const teamId = teamIds.get(block.team.id)

            if (!teamId) continue

            for (const entry of block.players) {
                if (
                    known.has(entry.player.id) ||
                    newcomers.has(entry.player.id) ||
                    entry.statistics.length === 0
                ) {
                    continue
                }

                const position = mapMatchPosition(entry.statistics[0].games.position)

                if (!position) {
                    stats.skippedNoPosition += 1

                    continue
                }

                newcomers.set(entry.player.id, {
                    externalId: entry.player.id,
                    name: entry.player.name,
                    position,
                    teamId,
                })
            }
        }

        const createdIds = await this.repo.createPlayers([...newcomers.values()])

        stats.createdPlayers += createdIds.size

        const rows: PlayerMatchStatsRow[] = []

        for (const block of blocks) {
            const teamId = teamIds.get(block.team.id)

            for (const entry of block.players) {
                if (!teamId) {
                    stats.skippedUnknownTeam += 1

                    continue
                }

                if (entry.statistics.length === 0) {
                    stats.skippedNoStats += 1

                    continue
                }

                const playerId = known.get(entry.player.id)?.id ?? createdIds.get(entry.player.id)

                if (!playerId) continue

                rows.push({ playerId, teamId, ...mapPlayerMatchStats(entry) })
            }
        }

        await this.repo.saveFixtureStats(fixture.id, rows)
        stats.rows += rows.length
    }
}
