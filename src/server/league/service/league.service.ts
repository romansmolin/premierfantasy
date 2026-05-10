import type {
    IBrowserCompetition,
    IBrowserNextCompetition,
    ILeagueBrowserItem,
    ILeagueService,
} from './league.service.interface'
import type {
    ICompetitionRow,
    ILeagueRepository,
    ILeagueSeasonRow,
    LeagueState,
} from '../repository/league.repository.interface'

const SOON_THRESHOLD_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

export class LeagueService implements ILeagueService {
    private readonly leagueRepository: ILeagueRepository

    constructor(leagueRepository: ILeagueRepository) {
        this.leagueRepository = leagueRepository
    }

    async getBrowser(): Promise<ILeagueBrowserItem[]> {
        const leagues = await this.leagueRepository.findActiveLeagues()

        if (leagues.length === 0) return []

        const seasons = await this.leagueRepository.findSeasonsByLeagueIds(leagues.map((l) => l.id))
        const competitions = await this.leagueRepository.findPublicCompetitionsByLeagueSeasonIds(
            seasons.map((s) => s.id),
        )

        const seasonsByLeague = new Map<string, ILeagueSeasonRow[]>()

        for (const s of seasons) {
            const list = seasonsByLeague.get(s.leagueId) ?? []

            list.push(s)
            seasonsByLeague.set(s.leagueId, list)
        }

        const competitionsBySeason = new Map<string, ICompetitionRow[]>()

        for (const c of competitions) {
            if (!c.leagueSeasonId) continue

            const list = competitionsBySeason.get(c.leagueSeasonId) ?? []

            list.push(c)
            competitionsBySeason.set(c.leagueSeasonId, list)
        }

        const now = new Date()

        return leagues.map((league) => {
            const leagueSeasons = seasonsByLeague.get(league.id) ?? []
            const currentSeason =
                leagueSeasons.find((s) => s.isCurrent) ??
                leagueSeasons.find((s) => s.startDate <= now && s.endDate >= now) ??
                null

            const seasonComps = currentSeason ? (competitionsBySeason.get(currentSeason.id) ?? []) : []

            const active = this.pickActiveCompetition(seasonComps, now)
            const next = this.pickNextCompetition(seasonComps, currentSeason, now)
            const state = this.computeState(currentSeason, active, next, now)

            return {
                league: {
                    id: league.id,
                    externalId: league.externalId,
                    name: league.name,
                    country: league.country,
                    logo: league.logo,
                    type: league.type,
                },
                state,
                currentSeason: currentSeason
                    ? {
                          year: currentSeason.year,
                          startDate: currentSeason.startDate.toISOString(),
                          endDate: currentSeason.endDate.toISOString(),
                      }
                    : null,
                activeCompetition: active,
                nextCompetition: next,
            }
        })
    }

    private pickActiveCompetition(comps: ICompetitionRow[], now: Date): IBrowserCompetition | null {
        const live = comps
            .filter((c) => c.status === 'active')
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

        if (!live) return null

        return {
            id: live.id,
            name: live.name,
            startGameweek: live.startGameweek,
            endGameweek: live.endGameweek,
            joinDeadline: live.joinDeadline?.toISOString() ?? null,
        }
    }

    private pickNextCompetition(
        comps: ICompetitionRow[],
        season: ILeagueSeasonRow | null,
        now: Date,
    ): IBrowserNextCompetition | null {
        const upcoming = comps
            .filter((c) => c.status === 'upcoming')
            .sort((a, b) => {
                const aTime = a.joinDeadline?.getTime() ?? a.createdAt.getTime()
                const bTime = b.joinDeadline?.getTime() ?? b.createdAt.getTime()

                return aTime - bTime
            })[0]

        if (upcoming) {
            const startMs = upcoming.joinDeadline?.getTime() ?? upcoming.createdAt.getTime()

            return {
                id: upcoming.id,
                name: upcoming.name,
                startGameweek: upcoming.startGameweek,
                endGameweek: upcoming.endGameweek,
                joinDeadline: upcoming.joinDeadline?.toISOString() ?? null,
                daysUntilStart: Math.max(0, Math.ceil((startMs - now.getTime()) / MS_PER_DAY)),
            }
        }

        if (!season) return null

        if (season.startDate <= now) return null

        return null
    }

    private computeState(
        season: ILeagueSeasonRow | null,
        active: IBrowserCompetition | null,
        next: IBrowserNextCompetition | null,
        now: Date,
    ): LeagueState {
        if (active) return 'LIVE'

        if (season && season.startDate <= now && season.endDate >= now) return 'LIVE'

        if (next && next.daysUntilStart <= SOON_THRESHOLD_DAYS) return 'SOON'

        if (season && season.startDate > now) {
            const days = Math.ceil((season.startDate.getTime() - now.getTime()) / MS_PER_DAY)

            if (days <= SOON_THRESHOLD_DAYS) return 'SOON'
        }

        return 'OFF_SEASON'
    }
}
