import type { MatchPrediction, PlayerAnalysis } from '@/entities/ai/model/ai.types'

import { apiFootballClient } from '@/shared/api/api-football-client'
import { openaiClient } from '@/shared/api/openai-client'
import { LEAGUE_ID, SEASON } from '@/shared/config/league'

import type {
    IFantasyTeamRepository,
    SquadPlayerRow,
} from '@/server/fantasy-team/repository/fantasy-team.repository.interface'

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

export class AITransferService {
    private readonly fantasyTeamRepository: IFantasyTeamRepository

    constructor(fantasyTeamRepository: IFantasyTeamRepository) {
        this.fantasyTeamRepository = fantasyTeamRepository
    }

    async analyzeSquad(fantasyTeamId: string): Promise<AITransferAnalysis> {
        const squad = await this.fantasyTeamRepository.getSquadPlayers(fantasyTeamId)

        if (squad.length === 0) throw new Error('No squad found')

        const playerStats = await this.fetchSquadStats(squad)

        const topPerformers = await this.fetchTopPerformers()

        const analysis = await this.callAI(squad, playerStats, topPerformers)

        return analysis
    }

    async analyzePlayer(playerExternalId: number): Promise<PlayerAnalysis> {
        const [currentSeasonData, lastSeasonData] = await Promise.all([
            apiFootballClient
                .get<unknown[]>('/players', { id: playerExternalId, season: SEASON })
                .catch(() => []),
            apiFootballClient
                .get<unknown[]>('/players', { id: playerExternalId, season: SEASON - 1 })
                .catch(() => []),
        ])

        const systemPrompt = `You are an expert Fantasy Premier League analyst. You analyze individual player performance data across seasons to provide detailed assessments.

SCORING RULES:
- Appearance: 2pts if 60+ min, 1pt if <60 min
- Goals: GK/DEF=6pts, MID=5pts, FWD=4pts
- Assists: 3pts each
- Clean sheet (60+ min): GK/DEF=4pts, MID=1pt, FWD=0
- GK saves: 1pt per 3 saves
- Penalty saved: 5pts, Penalty missed: -2pts
- Goals conceded (GK/DEF): -1pt per 2 conceded
- Yellow: -1pt, Red: -3pts, Own goal: -2pts

Analyze the player's form, strengths, weaknesses, and fantasy value. Provide a keep/sell recommendation.

Respond ONLY with valid JSON matching this exact structure (no markdown, no backticks):
{
  "playerName": "Full Name",
  "overallRating": "Brief rating e.g. 8/10",
  "form": "Description of current form",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "fantasyVerdict": "2-3 sentence verdict on fantasy value",
  "keepOrSell": "Strong Hold" | "Hold" | "Consider Selling" | "Sell",
  "keyStats": [
    { "label": "Stat Name", "value": "Stat Value", "assessment": "Good/Average/Poor with context" }
  ],
  "prediction": "1-2 sentence prediction for rest of season"
}`

        const userPrompt = `Analyze this player for Fantasy Premier League purposes.

CURRENT SEASON (${SEASON}) STATS:
${JSON.stringify(currentSeasonData, null, 2)}

PREVIOUS SEASON (${SEASON - 1}) STATS:
${JSON.stringify(lastSeasonData, null, 2)}

Provide a thorough analysis comparing both seasons, assessing current form, and giving a clear fantasy recommendation.`

        const response = await openaiClient.analyze(systemPrompt, userPrompt)

        try {
            const cleaned = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            return JSON.parse(cleaned) as PlayerAnalysis
        } catch {
            return {
                playerName: 'Unknown',
                overallRating: 'N/A',
                form: response,
                strengths: [],
                weaknesses: [],
                fantasyVerdict: 'Analysis could not be fully structured.',
                keepOrSell: 'Hold',
                keyStats: [],
                prediction: 'Unable to generate prediction.',
            }
        }
    }

    async predictMatch(fixtureId: number): Promise<MatchPrediction> {
        const [fixtureData, predictionsData] = await Promise.all([
            apiFootballClient.get<unknown[]>('/fixtures', { id: fixtureId }).catch(() => []),
            apiFootballClient.get<unknown[]>('/predictions', { fixture: fixtureId }).catch(() => []),
        ])

        const fixture = Array.isArray(fixtureData) ? fixtureData[0] : null

        if (!fixture) {
            throw new Error('Fixture not found')
        }

        const teams = (fixture as Record<string, unknown>).teams as
            | { home?: { id?: number; name?: string }; away?: { id?: number; name?: string } }
            | undefined

        const homeTeamId = teams?.home?.id
        const awayTeamId = teams?.away?.id

        const [homeStats, awayStats, h2hData] = await Promise.all([
            homeTeamId
                ? apiFootballClient
                      .get<unknown>('/teams/statistics', {
                          team: homeTeamId,
                          league: LEAGUE_ID,
                          season: SEASON,
                      })
                      .catch(() => null)
                : Promise.resolve(null),
            awayTeamId
                ? apiFootballClient
                      .get<unknown>('/teams/statistics', {
                          team: awayTeamId,
                          league: LEAGUE_ID,
                          season: SEASON,
                      })
                      .catch(() => null)
                : Promise.resolve(null),
            homeTeamId && awayTeamId
                ? apiFootballClient
                      .get<unknown[]>('/fixtures/headtohead', {
                          h2h: `${homeTeamId}-${awayTeamId}`,
                          last: 5,
                      })
                      .catch(() => [])
                : Promise.resolve([]),
        ])

        const systemPrompt = `You are an expert Fantasy Premier League match analyst. You predict match outcomes and recommend fantasy picks based on statistical data.

SCORING RULES:
- Appearance: 2pts if 60+ min, 1pt if <60 min
- Goals: GK/DEF=6pts, MID=5pts, FWD=4pts
- Assists: 3pts each
- Clean sheet (60+ min): GK/DEF=4pts, MID=1pt, FWD=0
- GK saves: 1pt per 3 saves
- Penalty saved: 5pts, Penalty missed: -2pts
- Goals conceded (GK/DEF): -1pt per 2 conceded
- Yellow: -1pt, Red: -3pts, Own goal: -2pts

Respond ONLY with valid JSON matching this exact structure (no markdown, no backticks):
{
  "homeTeam": "Team Name",
  "awayTeam": "Team Name",
  "predictedScore": "X-Y",
  "winProbability": { "home": 0.XX, "draw": 0.XX, "away": 0.XX },
  "cleanSheetProbability": { "home": 0.XX, "away": 0.XX },
  "analysis": "2-3 sentence match preview",
  "keyMatchups": ["matchup 1", "matchup 2", "matchup 3"],
  "fantasyPicks": {
    "captainPick": { "name": "Player Name", "team": "Team", "reason": "Why captain" },
    "topPicks": [
      { "name": "Player Name", "team": "Team", "expectedPoints": "Xpts", "reason": "Why pick" }
    ]
  },
  "goalThreat": [
    { "name": "Player Name", "team": "Team", "likelihood": "High/Medium/Low" }
  ],
  "tacticalInsight": "One key tactical insight for fantasy managers"
}`

        const userPrompt = `Predict the outcome of this match and provide fantasy player recommendations.

FIXTURE DATA:
${JSON.stringify(fixture, null, 2)}

HOME TEAM STATISTICS:
${JSON.stringify(homeStats, null, 2)}

AWAY TEAM STATISTICS:
${JSON.stringify(awayStats, null, 2)}

HEAD-TO-HEAD (Last 5 meetings):
${JSON.stringify(h2hData, null, 2)}

API-FOOTBALL PREDICTIONS:
${JSON.stringify(predictionsData, null, 2)}

Provide a detailed prediction with score, probabilities, a fantasy captain pick, top 3 fantasy player picks with expected points, goal threats from both teams, and a tactical insight.`

        const response = await openaiClient.analyze(systemPrompt, userPrompt)

        try {
            const cleaned = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            return JSON.parse(cleaned) as MatchPrediction
        } catch {
            return {
                homeTeam: teams?.home?.name ?? 'Unknown',
                awayTeam: teams?.away?.name ?? 'Unknown',
                predictedScore: 'N/A',
                winProbability: { home: 0, draw: 0, away: 0 },
                cleanSheetProbability: { home: 0, away: 0 },
                analysis: response,
                keyMatchups: [],
                fantasyPicks: {
                    captainPick: { name: 'N/A', team: 'N/A', reason: 'Analysis could not be structured' },
                    topPicks: [],
                },
                goalThreat: [],
                tacticalInsight: 'Analysis could not be fully structured.',
            }
        }
    }

    private async fetchSquadStats(squad: SquadPlayerRow[]): Promise<Record<number, unknown>> {
        const stats: Record<number, unknown> = {}

        const results = await Promise.allSettled(
            squad.map(async (player) => {
                try {
                    const data = await apiFootballClient.get<unknown[]>('/players', {
                        id: player.externalId,
                        season: SEASON,
                    })

                    return { externalId: player.externalId, data: data[0] }
                } catch {
                    return { externalId: player.externalId, data: null }
                }
            }),
        )

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.data) {
                stats[result.value.externalId] = result.value.data
            }
        }

        return stats
    }

    private async fetchTopPerformers(): Promise<unknown[]> {
        try {
            const [topScorers, topAssists] = await Promise.all([
                apiFootballClient.get<unknown[]>('/players/topscorers', {
                    league: LEAGUE_ID,
                    season: SEASON,
                }),
                apiFootballClient.get<unknown[]>('/players/topassists', {
                    league: LEAGUE_ID,
                    season: SEASON,
                }),
            ])

            const scorers = (topScorers ?? []).slice(0, 10)
            const assists = (topAssists ?? []).slice(0, 10)

            return [...scorers, ...assists]
        } catch {
            return []
        }
    }

    private async callAI(
        squad: SquadPlayerRow[],
        playerStats: Record<number, unknown>,
        topPerformers: unknown[],
    ): Promise<AITransferAnalysis> {
        const systemPrompt = `You are an expert Fantasy Premier League analyst. You analyze squad composition and player performance data to recommend transfers.

SCORING RULES:
- Appearance: 2pts if 60+ min, 1pt if <60 min
- Goals: GK/DEF=6pts, MID=5pts, FWD=4pts
- Assists: 3pts each
- Clean sheet (60+ min): GK/DEF=4pts, MID=1pt, FWD=0
- GK saves: 1pt per 3 saves
- Penalty saved: 5pts, Penalty missed: -2pts
- Goals conceded (GK/DEF): -1pt per 2 conceded
- Yellow: -1pt, Red: -3pts, Own goal: -2pts

Respond ONLY with valid JSON matching this exact structure (no markdown, no backticks):
{
  "summary": "2-3 sentence overview of the squad",
  "squadStrengths": ["strength 1", "strength 2"],
  "squadWeaknesses": ["weakness 1", "weakness 2"],
  "suggestions": [
    {
      "playerOut": { "name": "Player Name", "position": "POS", "reason": "Why remove" },
      "playerIn": { "name": "Player Name", "position": "POS", "team": "Team Name", "reason": "Why add" },
      "expectedPointsGain": "+X pts per GW"
    }
  ],
  "keyInsight": "One key tactical insight"
}`

        const squadInfo = squad.map((p) => {
            const stats = playerStats[p.externalId]

            return {
                name: p.name,
                position: p.position,
                team: `Team ${p.teamExternalId}`,
                purchasePrice: p.purchasePrice,
                seasonStats: stats ?? 'No stats available',
            }
        })

        const userPrompt = `Analyze this Fantasy PL squad and suggest up to 3 transfer recommendations.

CURRENT SQUAD:
${JSON.stringify(squadInfo, null, 2)}

TOP PERFORMERS NOT IN SQUAD (potential transfers in):
${JSON.stringify(topPerformers.slice(0, 15), null, 2)}

Give specific, data-driven recommendations based on the stats provided. Focus on players who are underperforming vs available alternatives.`

        const response = await openaiClient.analyze(systemPrompt, userPrompt)

        try {
            const cleaned = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            return JSON.parse(cleaned) as AITransferAnalysis
        } catch {
            return {
                summary: response,
                squadStrengths: [],
                squadWeaknesses: [],
                suggestions: [],
                keyInsight: 'Analysis could not be fully structured.',
            }
        }
    }
}
