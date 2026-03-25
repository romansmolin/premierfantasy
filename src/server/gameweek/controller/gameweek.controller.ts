import { NextRequest, NextResponse } from 'next/server'

import { syncGameweeksSchema } from '@/entities/gameweek/model/gameweek.schema'

import type { IGameweekService } from '../service/gameweek.service.interface'

export class GameweekController {
    private readonly gameweekService: IGameweekService

    constructor(gameweekService: IGameweekService) {
        this.gameweekService = gameweekService
    }

    async getAll() {
        try {
            const gameweeks = await this.gameweekService.getAllGameweeks()

            return NextResponse.json(gameweeks)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch gameweeks'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }

    async getActive() {
        try {
            const gameweek = await this.gameweekService.getActiveGameweek()

            if (!gameweek) {
                return NextResponse.json({ error: 'No active gameweek' }, { status: 404 })
            }

            return NextResponse.json(gameweek)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch active gameweek'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }

    async activate(req: NextRequest) {
        try {
            const body = await req.json()
            const gameweekNumber = body.gameweekNumber

            if (typeof gameweekNumber !== 'number') {
                return NextResponse.json({ error: 'gameweekNumber is required' }, { status: 400 })
            }

            const gameweek = await this.gameweekService.activateGameweek(gameweekNumber)

            return NextResponse.json(gameweek)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to activate gameweek'

            return NextResponse.json({ error: message }, { status: 400 })
        }
    }

    async sync(req: NextRequest) {
        try {
            const body = await req.json()
            const parsed = syncGameweeksSchema.safeParse(body)

            if (!parsed.success) {
                return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
            }

            const gameweeks = await this.gameweekService.syncFromApi(parsed.data.season, parsed.data.leagueId)

            return NextResponse.json(gameweeks, { status: 201 })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to sync gameweeks'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }
}
