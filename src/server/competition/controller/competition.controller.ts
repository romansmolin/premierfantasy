import { NextRequest, NextResponse } from 'next/server'

import { createCompetitionSchema } from '@/entities/competition/model/competition.schema'

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
}
