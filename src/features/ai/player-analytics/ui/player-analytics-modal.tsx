'use client'

import {
    AiBrain01Icon,
    CheckmarkCircle01Icon,
    AlertCircleIcon,
    StarCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { PlayerAnalysis } from '@/entities/ai'

import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Separator } from '@/shared/ui/separator'
import { Skeleton } from '@/shared/ui/skeleton'

interface PlayerAnalyticsModalProps {
    open: boolean
    onClose: () => void
    analysis: PlayerAnalysis | null
    isLoading: boolean
}

const keepSellColor: Record<string, string> = {
    'Strong Hold': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    Hold: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Consider Selling': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    Sell: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export const PlayerAnalyticsModal = ({ open, onClose, analysis, isLoading }: PlayerAnalyticsModalProps) => {
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="p-0 max-w-3xl! max-h-[85vh] overflow-x-hidden">
                <DialogHeader className="px-6 pt-6 pb-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
                            <HugeiconsIcon icon={AiBrain01Icon} size={20} className="text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">
                                {analysis?.playerName ?? 'Player'} Analytics
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground">AI-powered deep analysis</p>
                        </div>
                        {analysis && (
                            <Badge className="ml-auto text-sm px-3 py-1">{analysis.overallRating}</Badge>
                        )}
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto px-6 pb-6 space-y-5">
                    {isLoading && (
                        <div className="space-y-4 pt-4">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-28 rounded-xl" />
                                <Skeleton className="h-28 rounded-xl" />
                            </div>
                            <Skeleton className="h-32 rounded-xl" />
                        </div>
                    )}

                    {!isLoading && analysis && (
                        <>
                            {/* Form */}
                            <Card className="border-none mt-2 bg-muted/40">
                                <CardContent className="p-5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                        Current Form
                                    </p>
                                    <p className="text-sm leading-relaxed">{analysis.form}</p>
                                </CardContent>
                            </Card>

                            {/* Strengths & Weaknesses */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card>
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <HugeiconsIcon
                                                icon={CheckmarkCircle01Icon}
                                                size={18}
                                                className="text-emerald-500"
                                            />
                                            <h4 className="text-sm font-bold">Strengths</h4>
                                        </div>
                                        <ul className="space-y-2">
                                            {analysis.strengths.map((s, i) => (
                                                <li key={i} className="flex gap-2 text-sm">
                                                    <span className="text-emerald-500 font-bold shrink-0">
                                                        +
                                                    </span>
                                                    <span className="leading-snug">{s}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <HugeiconsIcon
                                                icon={AlertCircleIcon}
                                                size={18}
                                                className="text-red-400"
                                            />
                                            <h4 className="text-sm font-bold">Weaknesses</h4>
                                        </div>
                                        <ul className="space-y-2">
                                            {analysis.weaknesses.map((w, i) => (
                                                <li key={i} className="flex gap-2 text-sm">
                                                    <span className="text-red-400 font-bold shrink-0">-</span>
                                                    <span className="leading-snug">{w}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            <Separator />

                            {/* Key Stats */}
                            {analysis.keyStats.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold mb-3">Key Stats</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {analysis.keyStats.map((stat, i) => (
                                            <Card key={i}>
                                                <CardContent className="p-4">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                                        {stat.label}
                                                    </p>
                                                    <p className="text-base font-bold text-primary mb-2">
                                                        {stat.value}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground leading-snug">
                                                        {stat.assessment}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Fantasy Verdict */}
                            <Card>
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-3">
                                        <HugeiconsIcon
                                            icon={StarCircleIcon}
                                            size={20}
                                            className="text-amber-500 shrink-0 mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                    Fantasy Verdict
                                                </p>
                                                <Badge className={keepSellColor[analysis.keepOrSell] ?? ''}>
                                                    {analysis.keepOrSell}
                                                </Badge>
                                            </div>
                                            <p className="text-sm leading-relaxed">
                                                {analysis.fantasyVerdict}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Prediction */}
                            <Card className="border-none bg-muted/40">
                                <CardContent className="p-5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                        Outlook
                                    </p>
                                    <p className="text-sm leading-relaxed">{analysis.prediction}</p>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {!isLoading && !analysis && (
                        <div className="py-12 text-center">
                            <p className="text-sm text-muted-foreground">No analysis available.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
