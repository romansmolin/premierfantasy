import { NextRequest, NextResponse } from 'next/server'

import { saveSquadSchema } from '@/entities/players'

import type { IFantasyTeamService } from '../service/fantasy-team.service.interface'

export class FantasyTeamController {
    private readonly fantasyTeamService

    constructor(fantasyTeamService: IFantasyTeamService) {
        this.fantasyTeamService = fantasyTeamService
    }

    async getAll() {
        const teams = await this.fantasyTeamService.getAllFantasyTeams()

        return NextResponse.json(teams)
    }

    async getById(id: string) {
        const team = await this.fantasyTeamService.getFantasyTeam(id)

        if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        return NextResponse.json(team)
    }

    async getByUserId(userId: string) {
        const teams = await this.fantasyTeamService.getFantasyTeamsByUser(userId)

        console.log('fantasyTeams: ', teams)

        return NextResponse.json(teams)
    }

    async create(req: NextRequest) {
        const body = await req.json()
        // validate with zod here
        const team = await this.fantasyTeamService.createFantasyTeam(body)

        return NextResponse.json(team, { status: 201 })
    }

    async update(req: NextRequest, id: string) {
        const body = await req.json()
        const team = await this.fantasyTeamService.updateFantasyTeam(id, body)

        return NextResponse.json(team)
    }

    async delete(id: string) {
        await this.fantasyTeamService.deleteFantasyTeam(id)

        return NextResponse.json(null, { status: 204 })
    }

    async getSquad(id: string) {
        try {
            const players = await this.fantasyTeamService.getSquad(id)

            return NextResponse.json(players)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch squad'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }

    async saveSquad(req: NextRequest, id: string) {
        const body = await req.json()
        const parsed = saveSquadSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        try {
            await this.fantasyTeamService.saveSquad(id, parsed.data.players)

            return NextResponse.json({ success: true })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save squad'

            return NextResponse.json({ error: message }, { status: 400 })
        }
    }
}
