'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { fplMappingService } from '@/entities/fpl-mapping'
import type { FplMappingList } from '@/entities/fpl-mapping'

import { ApiError } from '@/shared/api/api-error'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const errorMessage = (error: unknown): string => {
    if (ApiError.isApiError(error) && error.status === 401) return 'Wrong secret'

    return error instanceof Error ? error.message : 'Something went wrong'
}

export function FplMappingView() {
    // The secret lives only in this component's state: never in storage, the URL or logs.
    const [secret, setSecret] = useState('')
    const [data, setData] = useState<FplMappingList | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [chosen, setChosen] = useState<Record<number, string>>({})

    const load = async () => {
        setIsLoading(true)

        try {
            setData(await fplMappingService.list(secret))
        } catch (error) {
            setData(null)
            toast.error(errorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

    const act = async (action: () => Promise<void>) => {
        try {
            await action()
            await load()
        } catch (error) {
            toast.error(errorMessage(error))
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>FPL player matches</CardTitle>
                    <CardDescription>
                        FPL players with at least 90 minutes that are not matched to one of our players yet.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3">
                    <Input
                        type="password"
                        autoComplete="off"
                        placeholder="Admin secret"
                        value={secret}
                        onChange={(event) => setSecret(event.target.value)}
                    />
                    <Button onClick={load} disabled={!secret || isLoading}>
                        {isLoading ? 'Loading...' : 'Load'}
                    </Button>
                </CardContent>
            </Card>

            {data && (
                <>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="secondary">Mapped {data.counts.mapped}</Badge>
                        <Badge variant="outline">Ambiguous {data.counts.ambiguous}</Badge>
                        <Badge variant="outline">No candidate {data.counts.unmatched}</Badge>
                        <Badge variant="outline">Rejected {data.counts.rejected}</Badge>
                        <Badge variant="outline">To review {data.counts.autoToReview}</Badge>
                    </div>

                    {data.review.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Automatic matches to review</CardTitle>
                                <CardDescription>
                                    Matched by the sync with less than full confidence. A wrong match gives a
                                    player another player&apos;s price: replace it or remove it.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>FPL player</TableHead>
                                            <TableHead>Matched to</TableHead>
                                            <TableHead>Replace with</TableHead>
                                            <TableHead />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.review.map((item) => (
                                            <TableRow key={item.fplId}>
                                                <TableCell>
                                                    {item.fplName}
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        {item.team}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {item.playerName}
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        {item.confidence}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <select
                                                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                                                        value={chosen[item.fplId] ?? ''}
                                                        onChange={(event) =>
                                                            setChosen((prev) => ({
                                                                ...prev,
                                                                [item.fplId]: event.target.value,
                                                            }))
                                                        }
                                                    >
                                                        <option value="">Keep this match</option>
                                                        {item.candidates.map((candidate) => (
                                                            <option
                                                                key={candidate.playerId}
                                                                value={candidate.playerId}
                                                            >
                                                                {candidate.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </TableCell>
                                                <TableCell className="space-x-2 whitespace-nowrap">
                                                    <Button
                                                        size="sm"
                                                        disabled={!chosen[item.fplId]}
                                                        onClick={() =>
                                                            act(() =>
                                                                fplMappingService.replace(
                                                                    secret,
                                                                    item.fplId,
                                                                    chosen[item.fplId],
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        Replace
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            act(() =>
                                                                fplMappingService.unmap(secret, item.fplId),
                                                            )
                                                        }
                                                    >
                                                        Remove
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>FPL player</TableHead>
                                        <TableHead>Club</TableHead>
                                        <TableHead>Pos</TableHead>
                                        <TableHead>Our player</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.unmapped.map((player) => (
                                        <TableRow key={player.fplId}>
                                            <TableCell>
                                                {player.name}
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    £{player.nowCost.toFixed(1)}m · {player.minutes} min
                                                </span>
                                            </TableCell>
                                            <TableCell>{player.team}</TableCell>
                                            <TableCell>{player.position}</TableCell>
                                            <TableCell>
                                                <select
                                                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                                                    value={chosen[player.fplId] ?? ''}
                                                    onChange={(event) =>
                                                        setChosen((prev) => ({
                                                            ...prev,
                                                            [player.fplId]: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option value="">Choose…</option>
                                                    {player.candidates.map((candidate) => (
                                                        <option
                                                            key={candidate.playerId}
                                                            value={candidate.playerId}
                                                        >
                                                            {candidate.name}
                                                            {candidate.score > 0
                                                                ? ` (${candidate.score})`
                                                                : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </TableCell>
                                            <TableCell className="space-x-2 whitespace-nowrap">
                                                <Button
                                                    size="sm"
                                                    disabled={!chosen[player.fplId]}
                                                    onClick={() =>
                                                        act(() =>
                                                            fplMappingService.confirm(
                                                                secret,
                                                                player.fplId,
                                                                chosen[player.fplId],
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Confirm
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        act(() =>
                                                            fplMappingService.reject(secret, player.fplId),
                                                        )
                                                    }
                                                >
                                                    Reject
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
