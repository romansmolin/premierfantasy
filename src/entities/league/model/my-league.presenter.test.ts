import { describe, expect, it } from 'vitest'

import { resolveJoinWindow, resolveMyLeagueCta, sortMyLeagues } from './my-league.presenter'

import type { IMyLeague, IMyLeagueCompetition } from './league-membership.types'

const competition = (overrides: Partial<IMyLeagueCompetition> = {}): IMyLeagueCompetition => ({
    id: 'comp-1',
    name: 'PL GW1-5',
    startGameweek: 1,
    endGameweek: 5,
    status: 'active',
    joinDeadline: null,
    ...overrides,
})

const myLeague = (overrides: Partial<IMyLeague> = {}): IMyLeague => ({
    membershipId: 'membership-1',
    joinedAt: '2026-08-10T00:00:00.000Z',
    league: {
        id: 'league-1',
        externalId: 39,
        name: 'Premier League',
        country: 'England',
        logo: null,
        type: 'League',
    },
    season: {
        id: 'season-1',
        year: 2026,
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2027-05-31T00:00:00.000Z',
    },
    activeCompetition: competition(),
    nextCompetition: null,
    fantasyTeam: null,
    participantCount: 1,
    ...overrides,
})

describe('resolveMyLeagueCta', () => {
    it('asks a team-less manager to create one, pointing at the competition page', () => {
        const cta = resolveMyLeagueCta(myLeague())

        expect(cta).toEqual({
            action: 'CREATE_TEAM',
            label: 'Create Team',
            href: '/competitions/comp-1',
            competitionId: 'comp-1',
        })
    })

    it('sends a half-built squad back to the builder', () => {
        const cta = resolveMyLeagueCta(
            myLeague({
                fantasyTeam: {
                    id: 'team-1',
                    name: 'My Team',
                    competitionId: 'comp-1',
                    playerCount: 6,
                    isComplete: false,
                    rank: null,
                    totalPoints: null,
                },
            }),
        )

        expect(cta.action).toBe('FINISH_SQUAD')
        expect(cta.href).toBe('/fantasy-team-builder?competitionId=comp-1')
    })

    it('offers view/edit once the squad is complete', () => {
        const cta = resolveMyLeagueCta(
            myLeague({
                fantasyTeam: {
                    id: 'team-1',
                    name: 'My Team',
                    competitionId: 'comp-1',
                    playerCount: 11,
                    isComplete: true,
                    rank: 3,
                    totalPoints: 42,
                },
            }),
        )

        expect(cta.action).toBe('VIEW_TEAM')
        expect(cta.label).toBe('View Team')
    })

    it('treats a team from a previous round as no team for the current one', () => {
        const cta = resolveMyLeagueCta(
            myLeague({
                activeCompetition: competition({ id: 'comp-2' }),
                fantasyTeam: {
                    id: 'team-1',
                    name: 'My Team',
                    competitionId: 'comp-1',
                    playerCount: 11,
                    isComplete: true,
                    rank: 3,
                    totalPoints: 42,
                },
            }),
        )

        expect(cta.action).toBe('CREATE_TEAM')
        expect(cta.competitionId).toBe('comp-2')
    })

    it('falls back to the upcoming round when nothing is live', () => {
        const cta = resolveMyLeagueCta(
            myLeague({
                activeCompetition: null,
                nextCompetition: competition({ id: 'comp-9', status: 'upcoming' }),
            }),
        )

        expect(cta.competitionId).toBe('comp-9')
        expect(cta.action).toBe('CREATE_TEAM')
    })

    it('disables the action when the league has no round at all', () => {
        const cta = resolveMyLeagueCta(myLeague({ activeCompetition: null, nextCompetition: null }))

        expect(cta.action).toBe('NO_COMPETITION')
        expect(cta.href).toBeNull()
    })
})

describe('sortMyLeagues', () => {
    it('puts live leagues first, then the most recently joined', () => {
        const leagues = [
            myLeague({ membershipId: 'a', activeCompetition: null, joinedAt: '2026-08-01T00:00:00.000Z' }),
            myLeague({ membershipId: 'b', joinedAt: '2026-08-05T00:00:00.000Z' }),
            myLeague({ membershipId: 'c', activeCompetition: null, joinedAt: '2026-08-09T00:00:00.000Z' }),
            myLeague({ membershipId: 'd', joinedAt: '2026-08-11T00:00:00.000Z' }),
        ]

        expect(sortMyLeagues(leagues).map((l) => l.membershipId)).toEqual(['d', 'b', 'c', 'a'])
    })

    it('does not mutate the input', () => {
        const leagues = [
            myLeague({ membershipId: 'a', activeCompetition: null }),
            myLeague({ membershipId: 'b' }),
        ]

        sortMyLeagues(leagues)

        expect(leagues.map((l) => l.membershipId)).toEqual(['a', 'b'])
    })
})

describe('resolveJoinWindow', () => {
    const now = new Date('2026-08-10T12:00:00.000Z')
    const future = '2026-08-15T12:00:00.000Z'
    const past = '2026-08-01T12:00:00.000Z'

    it('reports the active round as open while its deadline is ahead', () => {
        const window = resolveJoinWindow(
            myLeague({ activeCompetition: competition({ joinDeadline: future }) }),
            now,
        )

        expect(window).toEqual({
            state: 'OPEN',
            competitionId: 'comp-1',
            competitionName: 'PL GW1-5',
            deadline: future,
        })
    })

    it('treats a missing deadline as open-ended', () => {
        const window = resolveJoinWindow(myLeague(), now)

        expect(window.state).toBe('OPEN')
        expect(window.deadline).toBeNull()
    })

    it('falls through to the upcoming round once the active one has closed', () => {
        const window = resolveJoinWindow(
            myLeague({
                activeCompetition: competition({ joinDeadline: past }),
                nextCompetition: competition({ id: 'comp-2', status: 'upcoming', joinDeadline: future }),
            }),
            now,
        )

        expect(window.state).toBe('OPEN')
        expect(window.competitionId).toBe('comp-2')
    })

    it('reports closed when every round deadline has passed', () => {
        const window = resolveJoinWindow(
            myLeague({
                activeCompetition: competition({ joinDeadline: past }),
                nextCompetition: competition({ id: 'comp-2', joinDeadline: '2026-08-05T12:00:00.000Z' }),
            }),
            now,
        )

        expect(window.state).toBe('CLOSED')
        // The latest deadline seen, so the card can say how recently it shut.
        expect(window.competitionId).toBe('comp-2')
    })

    it('never offers a completed round', () => {
        const window = resolveJoinWindow(
            myLeague({
                activeCompetition: competition({ status: 'completed', joinDeadline: null }),
                nextCompetition: null,
            }),
            now,
        )

        expect(window.state).toBe('CLOSED')
    })

    it('reports none when the league has no round at all', () => {
        const window = resolveJoinWindow(myLeague({ activeCompetition: null, nextCompetition: null }), now)

        expect(window).toEqual({
            state: 'NONE',
            competitionId: null,
            competitionName: null,
            deadline: null,
        })
    })
})
