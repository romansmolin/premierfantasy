import { LEAGUE_ID, SEASON } from '@/shared/config/league'

import type { ICompetitionService } from '@/server/competition/service/competition.service.interface'
import type { IGameweekService } from '@/server/gameweek/service/gameweek.service.interface'
import type { IScoringService } from '@/server/scoring/service/scoring.service.interface'

export interface PipelineResult {
    activatedGameweek: number | null
    scoredGameweeks: number[]
    transitioned: boolean
    generated: boolean
    errors: string[]
}

export class OrchestratorService {
    private readonly gameweekService
    private readonly scoringService
    private readonly competitionService

    constructor(
        gameweekService: IGameweekService,
        scoringService: IScoringService,
        competitionService: ICompetitionService,
    ) {
        this.gameweekService = gameweekService
        this.scoringService = scoringService
        this.competitionService = competitionService
    }

    async runPipeline(): Promise<PipelineResult> {
        const result: PipelineResult = {
            activatedGameweek: null,
            scoredGameweeks: [],
            transitioned: false,
            generated: false,
            errors: [],
        }

        // 1. Score unfinished past gameweeks first (before activation)
        try {
            const unfinished = await this.gameweekService.getUnfinishedPastGameweeks()

            for (const gw of unfinished) {
                try {
                    await this.scoringService.calculateGameweek(gw.id, SEASON, LEAGUE_ID)
                    result.scoredGameweeks.push(gw.number)
                } catch (error) {
                    result.errors.push(
                        `Scoring GW${gw.number}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    )
                }
            }
        } catch (error) {
            result.errors.push(`Scoring fetch: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        // 2. Activate correct gameweek (after scoring, so we pick the right next one)
        try {
            let targetGw = await this.gameweekService.getCurrentGameweek()

            if (!targetGw) {
                // No GW covers current date — find the next unfinished one
                const allGws = await this.gameweekService.getAllGameweeks()
                const nextUnfinished = allGws
                    .filter((gw) => !gw.isFinished)
                    .sort((a, b) => a.number - b.number)[0]

                targetGw = nextUnfinished ?? null
            }

            const activeGw = await this.gameweekService.getActiveGameweek()

            if (targetGw && targetGw.id !== activeGw?.id) {
                await this.gameweekService.activateGameweek(targetGw.number)
                result.activatedGameweek = targetGw.number
            }
        } catch (error) {
            result.errors.push(`Activation: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        // 3. Transition competitions
        try {
            await this.competitionService.transitionCompetitions()
            result.transitioned = true
        } catch (error) {
            result.errors.push(`Transition: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        // 4. Generate missing competitions
        try {
            await this.competitionService.generateRollingCompetitions(38)
            result.generated = true
        } catch (error) {
            result.errors.push(`Generation: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        return result
    }
}
