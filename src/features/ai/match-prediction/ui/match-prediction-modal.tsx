'use client'

import { AiBrain01Icon, StarCircleIcon, ChartLineData02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { MatchPrediction } from '@/entities/ai'

import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Separator } from '@/shared/ui/separator'
import { Skeleton } from '@/shared/ui/skeleton'

interface MatchPredictionModalProps {
    open: boolean
    onClose: () => void
    prediction: MatchPrediction | null
    isLoading: boolean
}

const ProbabilityBar = ({ home, draw, away }: { home: number; draw: number; away: number }) => (
    <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
            <span className="text-blue-600 dark:text-blue-400">Home {home}%</span>
            <span className="text-muted-foreground">Draw {draw}%</span>
            <span className="text-red-500 dark:text-red-400">Away {away}%</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden">
            <div className="bg-blue-500 transition-all duration-500" style={{ width: `${home}%` }} />
            <div className="bg-muted transition-all duration-500" style={{ width: `${draw}%` }} />
            <div className="bg-red-400 transition-all duration-500" style={{ width: `${away}%` }} />
        </div>
    </div>
)

const LikelihoodBadgeColor: Record<string, string> = {
    High: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    Low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const getLikelihoodColor = (likelihood: string): string => {
    for (const [key, value] of Object.entries(LikelihoodBadgeColor)) {
        if (likelihood.toLowerCase().includes(key.toLowerCase())) return value
    }

    return 'bg-muted text-muted-foreground'
}

export const MatchPredictionModal = ({ open, onClose, prediction, isLoading }: MatchPredictionModalProps) => {
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="p-0 max-w-3xl! max-h-[85vh] overflow-x-hidden">
                <DialogHeader className="px-6 pt-6 pb-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
                            <HugeiconsIcon icon={AiBrain01Icon} size={20} className="text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">Match Prediction</DialogTitle>
                            <p className="text-xs text-muted-foreground">AI-powered match insights</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto px-6 pb-6 space-y-5">
                    {isLoading && (
                        <div className="space-y-4 pt-4">
                            <Skeleton className="h-16 rounded-xl" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-28 rounded-xl" />
                                <Skeleton className="h-28 rounded-xl" />
                            </div>
                            <Skeleton className="h-32 rounded-xl" />
                            <Skeleton className="h-24 rounded-xl" />
                        </div>
                    )}

                    {!isLoading && prediction && (
                        <>
                            {/* Header: Teams & Predicted Score */}
                            <Card className="border-none bg-muted/40 mt-2">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-center gap-4">
                                        <span className="text-sm font-bold text-right flex-1 truncate">
                                            {prediction.homeTeam}
                                        </span>
                                        <Badge className="text-base px-4 py-1.5 font-bold tabular-nums">
                                            {prediction.predictedScore}
                                        </Badge>
                                        <span className="text-sm font-bold text-left flex-1 truncate">
                                            {prediction.awayTeam}
                                        </span>
                                    </div>
                                    <p className="text-center text-xs text-muted-foreground mt-2">
                                        Predicted Score
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Win Probability */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                                    Win Probability
                                </p>
                                <ProbabilityBar
                                    home={prediction.winProbability.home}
                                    draw={prediction.winProbability.draw}
                                    away={prediction.winProbability.away}
                                />
                            </div>

                            {/* Clean Sheet Probability */}
                            <div className="flex gap-3">
                                <Card className="flex-1">
                                    <CardContent className="p-4 text-center">
                                        <p className="text-xs text-muted-foreground mb-1">
                                            {prediction.homeTeam} CS
                                        </p>
                                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                            {prediction.cleanSheetProbability.home}%
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="flex-1">
                                    <CardContent className="p-4 text-center">
                                        <p className="text-xs text-muted-foreground mb-1">
                                            {prediction.awayTeam} CS
                                        </p>
                                        <p className="text-lg font-bold text-red-500 dark:text-red-400">
                                            {prediction.cleanSheetProbability.away}%
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Separator />

                            {/* Analysis */}
                            <Card className="border-none bg-muted/40">
                                <CardContent className="p-5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                        Analysis
                                    </p>
                                    <p className="text-sm leading-relaxed">{prediction.analysis}</p>
                                </CardContent>
                            </Card>

                            {/* Key Matchups */}
                            {prediction.keyMatchups.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                                        Key Matchups
                                    </p>
                                    <ul className="space-y-2">
                                        {prediction.keyMatchups.map((matchup, i) => (
                                            <li key={i} className="flex gap-2 text-sm">
                                                <span className="text-primary font-bold shrink-0">-</span>
                                                <span className="leading-snug">{matchup}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <Separator />

                            {/* Fantasy Picks */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <HugeiconsIcon
                                        icon={StarCircleIcon}
                                        size={18}
                                        className="text-amber-500"
                                    />
                                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                        Fantasy Picks
                                    </p>
                                </div>

                                {/* Captain Pick */}
                                <Card className="mb-3 border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <HugeiconsIcon
                                                icon={StarCircleIcon}
                                                size={16}
                                                className="text-amber-500"
                                            />
                                            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                Captain Pick
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold">
                                            {prediction.fantasyPicks.captainPick.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {prediction.fantasyPicks.captainPick.team}
                                        </p>
                                        <p className="text-sm mt-1 leading-snug">
                                            {prediction.fantasyPicks.captainPick.reason}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Top Picks Grid */}
                                {prediction.fantasyPicks.topPicks.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {prediction.fantasyPicks.topPicks.map((pick, i) => (
                                            <Card key={i}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-sm font-bold truncate">
                                                            {pick.name}
                                                        </p>
                                                        <Badge variant="secondary" className="shrink-0 ml-2">
                                                            {pick.expectedPoints} pts
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                        {pick.team}
                                                    </p>
                                                    <p className="text-xs leading-snug">{pick.reason}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Goal Threats */}
                            {prediction.goalThreat.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <HugeiconsIcon
                                            icon={ChartLineData02Icon}
                                            size={18}
                                            className="text-primary"
                                        />
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Goal Threats
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        {prediction.goalThreat.map((threat, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between rounded-lg border px-3 py-2"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium">{threat.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {threat.team}
                                                    </p>
                                                </div>
                                                <Badge className={getLikelihoodColor(threat.likelihood)}>
                                                    {threat.likelihood}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tactical Insight */}
                            <Card className="border-none bg-muted/40">
                                <CardContent className="p-5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                        Tactical Insight
                                    </p>
                                    <p className="text-sm leading-relaxed">{prediction.tacticalInsight}</p>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {!isLoading && !prediction && (
                        <div className="py-12 text-center">
                            <p className="text-sm text-muted-foreground">No prediction available.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
