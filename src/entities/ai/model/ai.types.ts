export interface TransferSuggestion {
    playerOut: { name: string; position: string; reason: string }
    playerIn: { name: string; position: string; team: string; reason: string }
    expectedPointsGain: string
}

export interface AITransferAnalysis {
    summary: string
    squadStrengths: string[]
    squadWeaknesses: string[]
    suggestions: TransferSuggestion[]
    keyInsight: string
}

export interface PlayerAnalysis {
    playerName: string
    overallRating: string
    form: string
    strengths: string[]
    weaknesses: string[]
    fantasyVerdict: string
    keepOrSell: 'Strong Hold' | 'Hold' | 'Consider Selling' | 'Sell'
    keyStats: { label: string; value: string; assessment: string }[]
    prediction: string
}

export interface MatchPrediction {
    homeTeam: string
    awayTeam: string
    predictedScore: string
    winProbability: { home: number; draw: number; away: number }
    cleanSheetProbability: { home: number; away: number }
    analysis: string
    keyMatchups: string[]
    fantasyPicks: {
        captainPick: { name: string; team: string; reason: string }
        topPicks: { name: string; team: string; expectedPoints: string; reason: string }[]
    }
    goalThreat: { name: string; team: string; likelihood: string }[]
    tacticalInsight: string
}
