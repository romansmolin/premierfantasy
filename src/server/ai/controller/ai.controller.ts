import { NextResponse } from 'next/server'

import { auth } from '@/shared/lib/auth'

import type { AITransferService } from '../service/ai-transfer.service'
import type { NextRequest } from 'next/server'

export class AIController {
    private readonly aiTransferService: AITransferService

    constructor(aiTransferService: AITransferService) {
        this.aiTransferService = aiTransferService
    }

    async getPlayerAnalysis(req: NextRequest) {
        const session = await auth.api.getSession({ headers: req.headers })

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const playerExternalId = req.nextUrl.searchParams.get('playerId')

        if (!playerExternalId) {
            return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
        }

        const parsedId = Number(playerExternalId)

        if (Number.isNaN(parsedId)) {
            return NextResponse.json({ error: 'playerId must be a number' }, { status: 400 })
        }

        try {
            const analysis = await this.aiTransferService.analyzePlayer(parsedId)

            return NextResponse.json(analysis)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Player analysis failed'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }

    async getMatchPrediction(req: NextRequest) {
        const session = await auth.api.getSession({ headers: req.headers })

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const fixtureId = req.nextUrl.searchParams.get('fixtureId')

        if (!fixtureId) {
            return NextResponse.json({ error: 'fixtureId is required' }, { status: 400 })
        }

        const parsedId = Number(fixtureId)

        if (Number.isNaN(parsedId)) {
            return NextResponse.json({ error: 'fixtureId must be a number' }, { status: 400 })
        }

        try {
            const prediction = await this.aiTransferService.predictMatch(parsedId)

            return NextResponse.json(prediction)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Match prediction failed'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }

    async getTransferSuggestions(req: NextRequest) {
        const session = await auth.api.getSession({ headers: req.headers })

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const fantasyTeamId = req.nextUrl.searchParams.get('fantasyTeamId')

        if (!fantasyTeamId) {
            return NextResponse.json({ error: 'fantasyTeamId is required' }, { status: 400 })
        }

        try {
            const analysis = await this.aiTransferService.analyzeSquad(fantasyTeamId)

            return NextResponse.json(analysis)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Analysis failed'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }
}
