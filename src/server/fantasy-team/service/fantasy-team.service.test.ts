import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'

import type { AppError } from '@/shared/lib/http'

import { FantasyTeamService } from './fantasy-team.service'

import type { IFantasyTeamRepository } from '../repository/fantasy-team.repository.interface'
import type { ILeagueMembershipService } from '@/server/league-membership/service/league-membership.service.interface'

const TEAM: IFantasyTeam = {
    id: 'team-1',
    userId: 'user-1',
    competitionId: 'comp-1',
    name: "Manager's Team",
    budgetTotal: 100,
    budgetLeft: 100,
    freeTransfers: 1,
    isDemo: false,
    createdAt: new Date('2026-08-10'),
}

const makeDeps = () => {
    const repository = {
        findByUserAndCompetition: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(TEAM),
        saveSquadPlayers: vi.fn().mockResolvedValue(undefined),
        findPlayerInternalIdByExternalId: vi.fn().mockResolvedValue(null),
    } as unknown as IFantasyTeamRepository & {
        findByUserAndCompetition: ReturnType<typeof vi.fn>
        create: ReturnType<typeof vi.fn>
        saveSquadPlayers: ReturnType<typeof vi.fn>
    }

    const membershipService = {
        joinCompetition: vi.fn().mockResolvedValue(undefined),
        joinLeague: vi.fn(),
        getMyLeagues: vi.fn(),
        getParticipants: vi.fn(),
    } as unknown as ILeagueMembershipService & { joinCompetition: ReturnType<typeof vi.fn> }

    const service = new FantasyTeamService(repository, undefined, undefined, membershipService)

    return { service, repository, membershipService }
}

const statusOf = async (promise: Promise<unknown>): Promise<number> => {
    try {
        await promise

        throw new Error('expected the call to reject')
    } catch (error) {
        return (error as AppError).statusCode
    }
}

const squadPlayer = (id: number, price = 5) => ({
    id,
    name: `Player ${id}`,
    position: 'MID' as const,
    price,
    teamId: 33,
})

describe('FantasyTeamService.createFantasyTeam', () => {
    let deps: ReturnType<typeof makeDeps>

    beforeEach(() => {
        deps = makeDeps()
    })

    it('creates the team and records the league membership', async () => {
        const team = await deps.service.createFantasyTeam({
            userId: 'user-1',
            competitionId: 'comp-1',
            name: "Manager's Team",
            budgetLeft: 100,
        })

        expect(deps.membershipService.joinCompetition).toHaveBeenCalledWith('user-1', 'comp-1')
        expect(deps.repository.create).toHaveBeenCalledOnce()
        expect(team).toEqual(TEAM)
    })

    it('rejects a second team in the same competition with a 409', async () => {
        deps.repository.findByUserAndCompetition.mockResolvedValue(TEAM)

        await expect(
            statusOf(
                deps.service.createFantasyTeam({
                    userId: 'user-1',
                    competitionId: 'comp-1',
                    name: 'Another Team',
                    budgetLeft: 100,
                }),
            ),
        ).resolves.toBe(409)

        expect(deps.repository.create).not.toHaveBeenCalled()
    })

    it('does not create the team when the competition is no longer joinable', async () => {
        deps.membershipService.joinCompetition.mockRejectedValue(
            Object.assign(new Error('closed'), { statusCode: 422 }),
        )

        await expect(
            statusOf(
                deps.service.createFantasyTeam({
                    userId: 'user-1',
                    competitionId: 'comp-1',
                    name: "Manager's Team",
                    budgetLeft: 100,
                }),
            ),
        ).resolves.toBe(422)

        expect(deps.repository.create).not.toHaveBeenCalled()
    })
})

describe('FantasyTeamService.saveSquad', () => {
    let deps: ReturnType<typeof makeDeps>

    beforeEach(() => {
        deps = makeDeps()
    })

    it('saves a legal 11-player squad', async () => {
        const players = Array.from({ length: 11 }, (_, i) => squadPlayer(i + 1, 5))

        await deps.service.saveSquad('team-1', players)

        expect(deps.repository.saveSquadPlayers).toHaveBeenCalledOnce()
    })

    it('422s when the squad is not 11 players', async () => {
        const players = Array.from({ length: 9 }, (_, i) => squadPlayer(i + 1))

        await expect(statusOf(deps.service.saveSquad('team-1', players))).resolves.toBe(422)
        expect(deps.repository.saveSquadPlayers).not.toHaveBeenCalled()
    })

    it('422s when the squad busts the budget', async () => {
        const players = Array.from({ length: 11 }, (_, i) => squadPlayer(i + 1, 15))

        await expect(statusOf(deps.service.saveSquad('team-1', players))).resolves.toBe(422)
        expect(deps.repository.saveSquadPlayers).not.toHaveBeenCalled()
    })
})
