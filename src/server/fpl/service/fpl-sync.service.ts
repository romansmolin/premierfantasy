import { SuspiciousResponseError } from '@/server/sync/lib/errors'

import { FplNotFoundError } from '../lib/fpl-client'
import { matchPlayers } from '../lib/player-matcher'
import { assertSaneBootstrap } from '../lib/sanity'
import { matchTeams } from '../lib/team-matcher'

import type { IFplSyncService } from './fpl-sync.service.interface'
import type { IFplClient } from '../lib/fpl-client'
import type { FplBootstrap } from '../lib/fpl.types'
import type {
    FixtureFplLink,
    FixtureForLinking,
    FplGameSettingsRow,
    IFplRepository,
} from '../repository/fpl.repository.interface'
import type { JobOutcome } from '@/server/sync/lib/job.types'

const POSITIONS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' } as const
const MIN_FPL_FIXTURES = 100
const MIN_LIVE_ELEMENTS = 100
const MAX_KICKOFF_DIFF_MS = 36 * 60 * 60 * 1000

export class FplSyncService implements IFplSyncService {
    private readonly repo: IFplRepository
    private readonly client: IFplClient

    constructor(repo: IFplRepository, client: IFplClient) {
        this.repo = repo
        this.client = client
    }

    async syncBootstrap(seasonYear: number): Promise<JobOutcome> {
        const data = await this.client.getBootstrap()

        assertSaneBootstrap(data)

        const teams = await this.repo.findLeagueTeams(seasonYear)
        const { map: teamMap, unmatched: unmatchedTeams } = matchTeams(data.teams, teams)

        if (unmatchedTeams.length > 0) {
            throw new Error(
                `FPL teams not matched to our teams: ${unmatchedTeams.map((t) => t.name).join(', ')}`,
            )
        }

        await this.repo.saveEvents(
            data.events.map((e) => ({
                id: e.id,
                name: e.name,
                deadline: new Date(e.deadline_time),
                finished: e.finished,
                isCurrent: e.is_current,
                isNext: e.is_next,
            })),
        )
        await this.repo.saveGameSettings(this.toGameSettings(data, seasonYear))
        await this.repo.setTeamFplIds(teamMap)

        const state = await this.repo.loadMappingState()
        const ours = (await this.repo.findLeaguePlayers(seasonYear)).filter(
            (p) => !state.mappedPlayerIds.has(p.id),
        )
        const candidates = data.elements.filter(
            (e) => !state.mappedFplIds.has(e.id) && !state.rejectedFplIds.has(e.id),
        )
        const result = matchPlayers(candidates, ours, teamMap)
        const newMappings = await this.repo.insertAutoMappings(result.matched)

        const fplToPlayer = await this.repo.findFplPlayerMap()
        const priceRows = data.elements
            .filter((e) => fplToPlayer.has(e.id))
            .map((e) => ({ playerId: fplToPlayer.get(e.id) as string, price: e.now_cost / 10 }))
        const prices = await this.repo.upsertFplPrices(seasonYear, priceRows)

        // Only after the FPL prices are safely written may the placeholder prices go.
        const deletedFakePrices = await this.repo.deleteNonFplPrices(seasonYear)

        return {
            status: 'OK',
            stats: {
                mapped: fplToPlayer.size,
                newMappings,
                ambiguous: result.ambiguous.length,
                unmatched: data.elements.length - fplToPlayer.size,
                pricesInserted: prices.inserted,
                pricesUpdated: prices.updated,
                deletedFakePrices,
            },
        }
    }

    async linkFixtures(seasonYear: number): Promise<JobOutcome> {
        const fplFixtures = await this.client.getFixtures()

        if (!Array.isArray(fplFixtures) || fplFixtures.length < MIN_FPL_FIXTURES) {
            throw new SuspiciousResponseError(`FPL returned ${fplFixtures?.length ?? 0} fixtures`)
        }

        const ours = await this.repo.findFixturesForLinking(seasonYear)
        const used = new Set<string>()
        const links: FixtureFplLink[] = []

        for (const fixture of fplFixtures) {
            const candidates = ours.filter(
                (o) =>
                    !used.has(o.id) &&
                    o.homeFplTeamId === fixture.team_h &&
                    o.awayFplTeamId === fixture.team_a,
            )
            const match = this.pickFixture(candidates, fixture.kickoff_time)

            if (!match) continue

            used.add(match.id)
            links.push({ fixtureId: match.id, fplFixtureId: fixture.id, fplEvent: fixture.event })
        }

        await this.repo.setFixtureFplLinks(links)

        return { status: 'OK', stats: { linked: links.length, ourFixtures: ours.length } }
    }

    async syncPoints(): Promise<JobOutcome> {
        const events = await this.repo.findEvents()

        if (events.length === 0) throw new Error('No FPL events stored: run fpl-bootstrap first')

        const stored = await this.repo.findEventsWithPoints()
        const current = events.find((e) => e.isCurrent)
        // FPL corrects points after the fact, so the current and the previous event are always refreshed.
        const refresh = new Set(current ? [current.id, current.id - 1] : [])
        const toFetch = events.filter((e) => (e.finished && !stored.has(e.id)) || refresh.has(e.id))
        const stats = { events: 0, rows: 0, notFound: 0 }

        for (const event of toFetch) {
            let live

            try {
                live = await this.client.getEventLive(event.id)
            } catch (error) {
                if (error instanceof FplNotFoundError) {
                    stats.notFound += 1

                    continue
                }

                throw error
            }

            if (!Array.isArray(live?.elements) || live.elements.length < MIN_LIVE_ELEMENTS) {
                throw new SuspiciousResponseError(
                    `FPL event ${event.id} live data has ${live?.elements?.length ?? 0} players`,
                )
            }

            const rows = live.elements.map((e) => ({
                fplPlayerId: e.id,
                totalPoints: e.stats.total_points,
                minutes: e.stats.minutes,
            }))

            await this.repo.saveEventPoints(event.id, rows)
            stats.events += 1
            stats.rows += rows.length
        }

        return { status: 'OK', stats }
    }

    private pickFixture(candidates: FixtureForLinking[], kickoff: string | null): FixtureForLinking | null {
        if (candidates.length === 0) return null

        // A postponed fixture has no kickoff: accept it only when the club pair is unambiguous.
        if (!kickoff) return candidates.length === 1 ? candidates[0] : null

        const target = new Date(kickoff).getTime()
        const ranked = candidates
            .map((c) => ({ fixture: c, diff: Math.abs(c.kickoff.getTime() - target) }))
            .filter((c) => c.diff <= MAX_KICKOFF_DIFF_MS)
            .sort((a, b) => a.diff - b.diff)

        return ranked[0]?.fixture ?? null
    }

    private toGameSettings(data: FplBootstrap, seasonYear: number): FplGameSettingsRow {
        return {
            seasonYear,
            squadSize: data.game_settings.squad_squadsize,
            startingSize: data.game_settings.squad_squadplay,
            budgetTenths: data.game_settings.squad_total_spend,
            teamLimit: data.game_settings.squad_team_limit,
            positions: data.element_types
                .filter((t): t is typeof t & { id: 1 | 2 | 3 | 4 } => t.id in POSITIONS)
                .map((t) => ({
                    position: POSITIONS[t.id],
                    squadSelect: t.squad_select,
                    minPlay: t.squad_min_play,
                    maxPlay: t.squad_max_play,
                }))
                .sort(
                    (a, b) =>
                        ['GK', 'DEF', 'MID', 'FWD'].indexOf(a.position) -
                        ['GK', 'DEF', 'MID', 'FWD'].indexOf(b.position),
                ),
        }
    }
}
