'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { AI_FEATURE_PRICES } from '@/entities/ai'
import { squadService } from '@/entities/squad'
import type { AutoBuildResult, PoolPlayer, SquadReview } from '@/entities/squad'
import { useWallet } from '@/entities/wallet'

import { ApiError } from '@/shared/api/api-error'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

interface SquadAiPanelProps {
    players: Map<string, PoolPlayer>
    lockedIds: string[]
    excludedIds: string[]
    onUnlock: (id: string) => void
    onInclude: (id: string) => void
    /** Put an auto-built squad into the builder; the user still decides whether to save it. */
    onApply: (result: AutoBuildResult) => void
    /** The saved squad that "AI review" reads; null while the current squad is unsaved. */
    savedSquadId: string | null
    forecastEnabled: boolean
}

const failure = (error: unknown, cost: number) => {
    if (ApiError.isApiError(error) && error.status === 402) {
        return `Not enough credits: you need ${cost}.`
    }

    return error instanceof Error ? error.message : 'Something went wrong'
}

export function SquadAiPanel(props: SquadAiPanelProps) {
    const { players, lockedIds, excludedIds, savedSquadId, forecastEnabled } = props
    const { mutate: reloadWallet } = useWallet()
    const [building, setBuilding] = useState(false)
    const [reviewing, setReviewing] = useState(false)
    const [built, setBuilt] = useState<AutoBuildResult | null>(null)
    const [review, setReview] = useState<SquadReview | null>(null)
    const name = (id: string) => players.get(id)?.name ?? id

    const runBuild = async (refresh: boolean) => {
        const cost = AI_FEATURE_PRICES.AUTO_BUILD

        // The most expensive click on the site: always a deliberate second step.
        const label = refresh ? 'Recomputing with the current forecast' : 'Auto-build'

        if (
            !window.confirm(
                `${label} costs ${cost} Credits (free if you already have this result for the gameweek). Go ahead?`,
            )
        )
            return

        setBuilding(true)

        try {
            const result = await squadService.autoBuild({ lockedIds, excludedIds, refresh })

            setBuilt(result)
            props.onApply(result)
        } catch (error) {
            toast.error(failure(error, cost))
        } finally {
            setBuilding(false)
            await reloadWallet()
        }
    }

    const runReview = async (refresh: boolean) => {
        if (!savedSquadId) return

        const cost = AI_FEATURE_PRICES.SQUAD_REVIEW

        setReviewing(true)

        try {
            setReview(await squadService.review(savedSquadId, refresh))
        } catch (error) {
            toast.error(failure(error, cost))
        } finally {
            setReviewing(false)
            await reloadWallet()
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI tools</CardTitle>
                <CardDescription>
                    Paid with Credits. Repeating the same request in the same gameweek is free.{' '}
                    <Link href="/wallet" className="underline underline-offset-4">
                        Credits
                    </Link>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                {!forecastEnabled && (
                    <p className="text-muted-foreground">
                        Auto-build and the squad review are off until the forecast beats the baseline.
                    </p>
                )}

                <div className="space-y-2">
                    <p className="font-semibold">Auto-build</p>
                    <p className="text-muted-foreground">
                        Builds the best squad for the next gameweek under the FPL rules. Choose «Keep in
                        auto-build» on a card to keep a player, or Exclude in the player list to rule one out.
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {lockedIds.map((id) => (
                            <Badge key={id} variant="secondary">
                                locked: {name(id)}
                                <button
                                    className="ml-1"
                                    onClick={() => props.onUnlock(id)}
                                    aria-label="Unlock"
                                >
                                    ✕
                                </button>
                            </Badge>
                        ))}
                        {excludedIds.map((id) => (
                            <Badge key={id} variant="outline">
                                excluded: {name(id)}
                                <button
                                    className="ml-1"
                                    onClick={() => props.onInclude(id)}
                                    aria-label="Include"
                                >
                                    ✕
                                </button>
                            </Badge>
                        ))}
                    </div>
                    <Button onClick={() => runBuild(false)} disabled={building || !forecastEnabled}>
                        {building ? 'Building...' : `Auto-build (${AI_FEATURE_PRICES.AUTO_BUILD} Credits)`}
                    </Button>
                    {built && (
                        <div className="space-y-2 rounded-md border p-3">
                            <p>
                                Gameweek {built.event} · cost £{(built.totalTenths / 10).toFixed(1)}m ·
                                forecast XI {built.expectedXi.toFixed(1)} (captain doubled). Loaded into the
                                builder above: save it if you like it.
                            </p>
                            {built.explanation && (
                                <p className="text-muted-foreground">{built.explanation}</p>
                            )}
                            {built.forecastUpdated && (
                                <p>
                                    <Badge variant="outline">Forecast updated</Badge> This squad was built
                                    from an earlier forecast.{' '}
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        disabled={building}
                                        onClick={() => runBuild(true)}
                                    >
                                        Recompute ({AI_FEATURE_PRICES.AUTO_BUILD} Credits)
                                    </Button>
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <p className="font-semibold">AI squad review</p>
                    <p className="text-muted-foreground">
                        Reviews the <em>saved</em> version of the squad you have open.
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => runReview(false)}
                        disabled={reviewing || !savedSquadId || !forecastEnabled}
                    >
                        {reviewing ? 'Reviewing...' : `AI review (${AI_FEATURE_PRICES.SQUAD_REVIEW} Credits)`}
                    </Button>
                    {!savedSquadId && <p className="text-muted-foreground">Save the squad first.</p>}
                    {review && (
                        <div className="space-y-2 rounded-md border p-3">
                            <p>{review.summary}</p>
                            {review.strengths.length > 0 && (
                                <div>
                                    <p className="font-medium">Strengths</p>
                                    <ul className="list-disc pl-5">
                                        {review.strengths.map((s) => (
                                            <li key={s}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {review.risks.length > 0 && (
                                <div>
                                    <p className="font-medium">Risks</p>
                                    <ul className="list-disc pl-5">
                                        {review.risks.map((s) => (
                                            <li key={s}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {review.suggestions.length > 0 && (
                                <div>
                                    <p className="font-medium">Suggested swaps</p>
                                    <ul className="list-disc pl-5">
                                        {review.suggestions.map((s) => (
                                            <li key={`${s.out}-${s.in}`}>
                                                {name(s.out)} → {name(s.in)}: {s.reason}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {review.forecastUpdated && (
                                <p>
                                    <Badge variant="outline">Forecast updated</Badge>{' '}
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        disabled={reviewing}
                                        onClick={() => runReview(true)}
                                    >
                                        Review again ({AI_FEATURE_PRICES.SQUAD_REVIEW} Credits)
                                    </Button>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
