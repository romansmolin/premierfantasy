'use client'

import { AiBrain01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Separator } from '@/shared/ui/separator'
import { Skeleton } from '@/shared/ui/skeleton'

import type { IPlayerDetails, IPlayerSeasonStats } from '../model/player-details.types'

interface PlayerDetailsModalProps {
    open: boolean
    onClose: () => void
    player: IPlayerDetails | null
    isLoading: boolean
    error: Error | null | undefined
    onRequestAnalysis?: () => void
    isAnalysisLoading?: boolean
    canAffordAnalysis?: boolean
    analysisCost?: number
}

const StatItem = ({
    label,
    value,
    highlight,
}: {
    label: string
    value: string | number | null
    highlight?: boolean
}) => (
    <div className="flex flex-col items-center rounded-lg bg-muted/50 px-3 py-2">
        <span className={`text-lg font-bold ${highlight ? 'text-primary' : ''}`}>{value ?? '-'}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
)

const SeasonCard = ({ stats }: { stats: IPlayerSeasonStats }) => (
    <Card className="overflow-hidden pt-0!">
        <CardHeader className="flex items-center gap-2 bg-muted/30 px-4 py-2.5 border-b">
            {stats.team?.logo && (
                <Image
                    src={stats.team.logo}
                    alt={stats.team.name}
                    width={20}
                    height={20}
                    className="size-5"
                />
            )}
            <span className="text-xs font-semibold">{stats.team?.name}</span>
            <span className="text-xs text-muted-foreground ml-auto">
                {stats.league?.name} {stats.league?.season}/{(stats.league?.season ?? 0) + 1}
            </span>
        </CardHeader>
        <CardContent className="p-3">
            <div className="grid grid-cols-4 gap-2">
                <StatItem label="Apps" value={stats.games?.appearences} />
                <StatItem label="Goals" value={stats.goals?.total} highlight />
                <StatItem label="Assists" value={stats.goals?.assists} highlight />
                <StatItem
                    label="Rating"
                    value={stats.games?.rating ? Number(stats.games.rating).toFixed(1) : null}
                />
            </div>

            <Separator className="my-3" />

            <div className="grid grid-cols-4 gap-2">
                <StatItem label="Minutes" value={stats.games?.minutes} />
                <StatItem
                    label="Pass %"
                    value={stats.passes?.accuracy != null ? `${stats.passes.accuracy}%` : null}
                />
                <StatItem label="Tackles" value={stats.tackles?.total} />
                <StatItem
                    label="Dribbles"
                    value={
                        stats.dribbles?.attempts != null
                            ? `${stats.dribbles.success ?? 0}/${stats.dribbles.attempts}`
                            : null
                    }
                />
            </div>

            <Separator className="my-3" />

            <div className="grid grid-cols-4 gap-2">
                <StatItem label="Interceptions" value={stats.tackles?.interceptions} />
                <StatItem label="Yellow" value={stats.cards?.yellow} />
                <StatItem label="Red" value={stats.cards?.red} />
                <StatItem
                    label="Penalties"
                    value={
                        stats.penalty?.scored != null
                            ? `${stats.penalty.scored}/${(stats.penalty.scored ?? 0) + (stats.penalty.missed ?? 0)}`
                            : null
                    }
                />
            </div>
        </CardContent>
    </Card>
)

export const PlayerDetailsModal = ({
    open,
    onClose,
    player,
    isLoading,
    error,
    onRequestAnalysis,
    isAnalysisLoading,
    canAffordAnalysis,
    analysisCost,
}: PlayerDetailsModalProps) => {
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="p-0 max-w-3xl! max-h-[85vh] overflow-y-scroll">
                <DialogHeader className="sr-only">
                    <DialogTitle>Player Details</DialogTitle>
                </DialogHeader>

                {isLoading && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="size-20 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-48" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Skeleton className="h-40 rounded-xl" />
                            <Skeleton className="h-40 rounded-xl" />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-6">
                        <p className="text-sm text-destructive">Failed to load player details.</p>
                    </div>
                )}

                {!isLoading && !error && !player && (
                    <div className="p-6">
                        <p className="text-sm text-muted-foreground">Player details not available.</p>
                    </div>
                )}

                {player && !isLoading && (
                    <div className="flex flex-col overflow-hidden">
                        <div className="relative bg-linear-to-br from-primary/10 via-background to-primary/5 px-6 py-5 flex justify-between">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <Image
                                        src={player.player.photo}
                                        alt={player.player.name}
                                        width={80}
                                        height={80}
                                        className="size-20 rounded-full object-cover ring-2 ring-border shadow-lg"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold truncate">
                                        {player.player.firstname} {player.player.lastname}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {player.player.nationality}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline">{player.player.age} yrs</Badge>
                                        {player.player.height && (
                                            <Badge variant="outline">{player.player.height}</Badge>
                                        )}
                                        {player.player.weight && (
                                            <Badge variant="outline">{player.player.weight}</Badge>
                                        )}
                                        {player.player.birth?.place && (
                                            <Badge variant="secondary">{player.player.birth.place}</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {onRequestAnalysis && (
                                <div className="mt-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        disabled={isAnalysisLoading || !canAffordAnalysis}
                                        onClick={onRequestAnalysis}
                                    >
                                        <HugeiconsIcon icon={AiBrain01Icon} size={14} />
                                        {isAnalysisLoading
                                            ? 'Analyzing...'
                                            : `AI Analysis (${analysisCost ?? 100} coins)`}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                            {player.statistics.length > 0 ? (
                                player.statistics.map((stats, idx) => (
                                    <SeasonCard
                                        key={`${stats.league?.season}-${stats.team?.id}-${idx}`}
                                        stats={stats}
                                    />
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No season statistics available.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
