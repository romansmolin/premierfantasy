'use client'

import {
    AiBrain01Icon,
    ArrowRight01Icon,
    CheckmarkCircle01Icon,
    AlertCircleIcon,
    StarCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter } from 'next/navigation'

import { useCompetitionState } from '@/entities/competition'

import type { AITransferAnalysis } from '@/entities/ai'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Separator } from '@/shared/ui/separator'
import { Skeleton } from '@/shared/ui/skeleton'

interface TransferSuggestionsModalProps {
    open: boolean
    onClose: () => void
    analysis: AITransferAnalysis | null
    isLoading: boolean
}

export const TransferSuggestionsModal = ({
    open,
    onClose,
    analysis,
    isLoading,
}: TransferSuggestionsModalProps) => {
    const router = useRouter()
    const { state: competitionState } = useCompetitionState()

    const competitionId = competitionState?.activeCompetition?.id ?? competitionState?.upcomingCompetition?.id

    const handleGoToTransfers = () => {
        onClose()
        router.push(`/fantasy-team-builder?competitionId=${competitionId}`)
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="p-0 max-w-2xl! max-h-[85vh] overflow-x-hidden">
                <DialogHeader className="px-6 pt-6 pb-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
                            <HugeiconsIcon icon={AiBrain01Icon} size={20} className="text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">AI Transfer Analysis</DialogTitle>
                            <p className="text-xs text-muted-foreground">Powered by GPT deep reasoning</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto px-6 pb-6 space-y-6">
                    {isLoading && (
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="size-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                            <Skeleton className="h-24 rounded-xl" />
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-28 rounded-xl" />
                                <Skeleton className="h-28 rounded-xl" />
                            </div>
                            <Skeleton className="h-40 rounded-xl" />
                            <Skeleton className="h-40 rounded-xl" />
                        </div>
                    )}

                    {!isLoading && analysis && (
                        <>
                            {/* Summary */}
                            <Card className="border-none bg-muted/40">
                                <CardContent className="p-5">
                                    <p className="text-sm leading-relaxed">{analysis.summary}</p>
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
                                        <ul className="space-y-2.5">
                                            {analysis.squadStrengths.map((s, i) => (
                                                <li key={i} className="flex gap-2.5 text-sm">
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
                                        <ul className="space-y-2.5">
                                            {analysis.squadWeaknesses.map((w, i) => (
                                                <li key={i} className="flex gap-2.5 text-sm">
                                                    <span className="text-red-400 font-bold shrink-0">-</span>
                                                    <span className="leading-snug">{w}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            <Separator />

                            {/* Transfer Suggestions */}
                            <div>
                                <h3 className="text-base font-bold mb-4">Recommended Transfers</h3>
                                <div className="space-y-4">
                                    {analysis.suggestions.map((suggestion, i) => (
                                        <Card key={i}>
                                            <CardContent className="p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-sm px-3 py-1 font-semibold"
                                                    >
                                                        Transfer {i + 1}
                                                    </Badge>
                                                    <Badge className="text-sm px-3 py-1 font-bold">
                                                        {suggestion.expectedPointsGain}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {/* Player Out */}
                                                    <div className="flex-1 rounded-xl bg-red-50 dark:bg-red-950/20 p-4">
                                                        <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                                                            Out
                                                        </p>
                                                        <p className="text-base font-bold text-red-600 dark:text-red-400">
                                                            {suggestion.playerOut.name}
                                                        </p>
                                                        <Badge variant="outline" className="mt-2 text-sm">
                                                            {suggestion.playerOut.position}
                                                        </Badge>
                                                        <p className="text-sm text-muted-foreground mt-3 leading-snug">
                                                            {suggestion.playerOut.reason}
                                                        </p>
                                                    </div>

                                                    {/* Arrow */}
                                                    <div className="shrink-0">
                                                        <HugeiconsIcon
                                                            icon={ArrowRight01Icon}
                                                            size={24}
                                                            className="text-muted-foreground"
                                                        />
                                                    </div>

                                                    {/* Player In */}
                                                    <div className="flex-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-4">
                                                        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2">
                                                            In
                                                        </p>
                                                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                                            {suggestion.playerIn.name}
                                                        </p>
                                                        <div className="flex gap-1.5 mt-2">
                                                            <Badge variant="outline" className="text-sm">
                                                                {suggestion.playerIn.position}
                                                            </Badge>
                                                            <Badge variant="secondary" className="text-sm">
                                                                {suggestion.playerIn.team}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-3 leading-snug">
                                                            {suggestion.playerIn.reason}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {analysis.suggestions.length === 0 && (
                                <Card className="border-none bg-muted/40">
                                    <CardContent className="p-8 text-center">
                                        <HugeiconsIcon
                                            icon={CheckmarkCircle01Icon}
                                            size={32}
                                            className="text-emerald-500 mx-auto mb-3"
                                        />
                                        <p className="text-sm font-medium">Your squad looks strong!</p>
                                        <p className="text-sm text-muted-foreground">
                                            No transfers recommended at this time.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            <Separator />

                            {/* Key Insight */}
                            <Card>
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 mt-0.5">
                                            <HugeiconsIcon
                                                icon={StarCircleIcon}
                                                size={20}
                                                className="text-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">
                                                Key Insight
                                            </p>
                                            <p className="text-sm leading-relaxed">{analysis.keyInsight}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CTA */}
                            {analysis.suggestions.length > 0 && competitionId && (
                                <Button size="lg" className="w-full gap-2" onClick={handleGoToTransfers}>
                                    <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
                                    Make Transfers Now
                                </Button>
                            )}
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
