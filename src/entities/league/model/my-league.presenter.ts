import type { IMyLeague, IMyLeagueCompetition } from './league-membership.types'

export type MyLeagueAction = 'CREATE_TEAM' | 'FINISH_SQUAD' | 'VIEW_TEAM' | 'NO_COMPETITION'

export interface MyLeagueCta {
    action: MyLeagueAction
    label: string
    /** Null when there is nothing to open yet. */
    href: string | null
    competitionId: string | null
}

/**
 * Turns a My Leagues row into the single call-to-action its card should show.
 * Kept pure so the rule set is testable without rendering.
 */
export function resolveMyLeagueCta(league: IMyLeague): MyLeagueCta {
    const competition = league.activeCompetition ?? league.nextCompetition

    if (!competition) {
        return {
            action: 'NO_COMPETITION',
            label: 'No round open yet',
            href: null,
            competitionId: null,
        }
    }

    const href = `/competitions/${competition.id}`
    const team = league.fantasyTeam

    if (!team || team.competitionId !== competition.id) {
        return { action: 'CREATE_TEAM', label: 'Create Team', href, competitionId: competition.id }
    }

    if (!team.isComplete) {
        return {
            action: 'FINISH_SQUAD',
            label: 'Finish Squad',
            href: `/fantasy-team-builder?competitionId=${competition.id}`,
            competitionId: competition.id,
        }
    }

    return {
        action: 'VIEW_TEAM',
        label: 'View Team',
        href: `/fantasy-team-builder?competitionId=${competition.id}`,
        competitionId: competition.id,
    }
}

/** Live leagues first, then soonest-starting, then most recently joined. */
export function sortMyLeagues(leagues: IMyLeague[]): IMyLeague[] {
    return [...leagues].sort((a, b) => {
        const aLive = a.activeCompetition ? 0 : 1
        const bLive = b.activeCompetition ? 0 : 1

        if (aLive !== bLive) return aLive - bLive

        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    })
}

export type JoinWindowState = 'OPEN' | 'CLOSED' | 'NONE'

export interface JoinWindow {
    state: JoinWindowState
    competitionId: string | null
    competitionName: string | null
    /** ISO timestamp joining closes at. Null means open with no announced cut-off. */
    deadline: string | null
}

const isJoinable = (competition: IMyLeagueCompetition, nowMs: number): boolean =>
    competition.status !== 'completed' &&
    (competition.joinDeadline === null || new Date(competition.joinDeadline).getTime() > nowMs)

/**
 * When the user can next enter a round of this league. An upcoming round is
 * joinable straight away — its `joinDeadline` is the cut-off, not the opening —
 * so the active round is preferred and the upcoming one is the fallback.
 */
export function resolveJoinWindow(league: IMyLeague, now: Date = new Date()): JoinWindow {
    const nowMs = now.getTime()
    const candidates = [league.activeCompetition, league.nextCompetition].filter(
        (competition): competition is IMyLeagueCompetition => competition !== null,
    )

    if (candidates.length === 0) {
        return { state: 'NONE', competitionId: null, competitionName: null, deadline: null }
    }

    const open = candidates.find((competition) => isJoinable(competition, nowMs))

    if (open) {
        return {
            state: 'OPEN',
            competitionId: open.id,
            competitionName: open.name,
            deadline: open.joinDeadline,
        }
    }

    const latest = candidates.reduce((best, competition) => {
        const bestMs = best.joinDeadline ? new Date(best.joinDeadline).getTime() : 0
        const currentMs = competition.joinDeadline ? new Date(competition.joinDeadline).getTime() : 0

        return currentMs > bestMs ? competition : best
    })

    return {
        state: 'CLOSED',
        competitionId: latest.id,
        competitionName: latest.name,
        deadline: latest.joinDeadline,
    }
}
