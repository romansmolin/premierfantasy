import type { MatchPrediction, PlayerAnalysis } from '@/entities/ai/model/ai.types'

export interface IAIInsightsService {
    getPlayerAnalysis(userId: string, playerExternalId: number): Promise<PlayerAnalysis>
    getMatchPrediction(userId: string, fixtureId: number): Promise<MatchPrediction>
}
