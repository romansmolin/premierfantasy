import { SuspiciousResponseError } from '@/server/sync/lib/errors'

import type { ApiFootballHttp } from '@/shared/api/api-football-http'
import { LEAGUE_ID } from '@/shared/config/league'

import { parseRoundNumber } from '../lib/round'

import type { IFixtureSyncService } from './fixture-sync.service.interface'
import type { FixtureUpsert, IMatchDataRepository } from '../repository/match-data.repository.interface'
import type { JobOutcome } from '@/server/sync/lib/job.types'
import type { RequestBudget } from '@/server/sync/lib/request-budget'

interface ApiFixtureRow {
    fixture: { id: number; date: string; status: { short: string } }
    league: { round: string }
    teams: { home: { id: number }; away: { id: number } }
    goals: { home: number | null; away: number | null }
}

/** A response with fewer fixtures than this share of what we already store is treated as broken. */
const MIN_SHARE_OF_STORED = 0.5

export class FixtureSyncService implements IFixtureSyncService {
    private readonly repo: IMatchDataRepository
    private readonly http: Pick<ApiFootballHttp, 'get'>

    constructor(repo: IMatchDataRepository, http: Pick<ApiFootballHttp, 'get'>) {
        this.repo = repo
        this.http = http
    }

    async syncFixtures(seasons: number[], budget: RequestBudget): Promise<JobOutcome> {
        const stats = { inserted: 0, updated: 0, seasons: 0 }
        let dailyRemaining: number | null = null

        for (const season of seasons) {
            if (!budget.take(dailyRemaining)) return { status: 'PARTIAL', stats }

            const leagueSeason = await this.repo.findLeagueSeason(LEAGUE_ID, season)

            if (!leagueSeason) {
                throw new Error(
                    `League season ${LEAGUE_ID}/${season} not found: run scripts/seed-leagues.ts first`,
                )
            }

            const response = await this.http.get<ApiFixtureRow[]>('/fixtures', { league: LEAGUE_ID, season })

            dailyRemaining = response.dailyRemaining

            const rows = await this.toRows(response.data, leagueSeason.id, season)
            const result = await this.repo.upsertFixtures(rows)

            stats.inserted += result.inserted
            stats.updated += result.updated
            stats.seasons += 1
        }

        return { status: 'OK', stats }
    }

    private async toRows(
        data: ApiFixtureRow[],
        leagueSeasonId: string,
        season: number,
    ): Promise<FixtureUpsert[]> {
        if (!Array.isArray(data) || data.length === 0) {
            throw new SuspiciousResponseError(`API-Football returned no fixtures for ${LEAGUE_ID}/${season}`)
        }

        const stored = await this.repo.countFixtures(leagueSeasonId)

        if (stored > 0 && data.length < stored * MIN_SHARE_OF_STORED) {
            throw new SuspiciousResponseError(
                `API-Football returned ${data.length} fixtures for ${LEAGUE_ID}/${season}, we store ${stored}`,
            )
        }

        const teamIds = await this.repo.findTeamIdsByExternalIds([
            ...new Set(data.flatMap((row) => [row.teams.home.id, row.teams.away.id])),
        ])
        const unknown = [
            ...new Set(
                data
                    .flatMap((row) => [row.teams.home.id, row.teams.away.id])
                    .filter((id) => !teamIds.has(id)),
            ),
        ]

        if (unknown.length > 0) {
            throw new Error(
                `Unknown teams in ${LEAGUE_ID}/${season} fixtures (external ids): ${unknown.join(', ')}`,
            )
        }

        return data.map((row) => ({
            externalId: row.fixture.id,
            leagueSeasonId,
            round: row.league.round,
            roundNumber: parseRoundNumber(row.league.round),
            kickoff: new Date(row.fixture.date),
            status: row.fixture.status.short,
            homeTeamId: teamIds.get(row.teams.home.id) as string,
            awayTeamId: teamIds.get(row.teams.away.id) as string,
            homeGoals: row.goals.home,
            awayGoals: row.goals.away,
        }))
    }
}
