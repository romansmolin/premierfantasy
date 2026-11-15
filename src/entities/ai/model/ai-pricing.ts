export type AiFeature = 'PLAYER_ANALYSIS' | 'MATCH_PREDICTION' | 'SQUAD_REVIEW' | 'AUTO_BUILD'

/** Credits charged per request. */
export const AI_FEATURE_PRICES: Record<AiFeature, number> = {
    PLAYER_ANALYSIS: 10,
    MATCH_PREDICTION: 10,
    SQUAD_REVIEW: 30,
    AUTO_BUILD: 300,
}

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
    PLAYER_ANALYSIS: 'Player analysis',
    MATCH_PREDICTION: 'Match prediction',
    SQUAD_REVIEW: 'Squad review',
    AUTO_BUILD: 'Auto-build',
}
