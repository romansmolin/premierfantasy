import type { MatchPrediction, PlayerAnalysis } from '@/entities/ai/model/ai.types'

export interface IAIGenerator {
    analyzePlayer(playerExternalId: number): Promise<PlayerAnalysis>
    predictMatch(fixtureId: number): Promise<MatchPrediction>
}
