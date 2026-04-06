import { NextRequest, NextResponse } from 'next/server'

import { createCompetitionSchema } from '@/entities/competition/model/competition.schema'

import { auth } from '@/shared/lib/auth'

import type { ICompetitionService } from '../service/competition.service.interface'

export class CompetitionController {
    private readonly competitionService

    constructor(competitionService: ICompetitionService) {
        this.competitionService = competitionService
    }

    async getAll() {
        const competitions = await this.competitionService.getAllCompetitions()

        return NextResponse.json(competitions)
    }

    async getById(id: string) {
        const competition = await this.competitionService.getCompetition(id)

        if (!competition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        return NextResponse.json(competition)
    }

    async create(req: NextRequest) {
        const body = await req.json()
        const parsed = createCompetitionSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        try {
            const competition = await this.competitionService.createCompetition(parsed.data)

            return NextResponse.json(competition, { status: 201 })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create competition'

            return NextResponse.json({ error: message }, { status: 400 })
        }
    }

    async delete(id: string) {
        await this.competitionService.deleteCompetition(id)

        return NextResponse.json(null, { status: 204 })
    }

    async getLeaderboard(competitionId: string) {
        try {
            const leaderboard = await this.competitionService.getLeaderboard(competitionId)

            return NextResponse.json(leaderboard)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch leaderboard'

            return NextResponse.json({ error: message }, { status: 404 })
        }
    }

    async getCompetitionState(req: NextRequest) {
        try {
            const session = await auth.api.getSession({ headers: req.headers })

            if (!session?.user?.id) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const state = await this.competitionService.getCompetitionState(session.user.id)

            return NextResponse.json(state)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get competition state'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }

    async generateCompetitions(req: NextRequest) {
        try {
            const body = await req.json()
            const totalGameweeks = body.totalGameweeks ?? 38

            await this.competitionService.generateRollingCompetitions(totalGameweeks)

            return NextResponse.json({ success: true }, { status: 201 })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to generate competitions'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }
}
