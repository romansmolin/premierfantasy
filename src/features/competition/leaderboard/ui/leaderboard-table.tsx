'use client'

import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

import { useLeaderboard } from '../model/use-leaderboard'

interface LeaderboardTableProps {
    competitionId: string
    currentUserId?: string
}

export const LeaderboardTable = ({ competitionId, currentUserId }: LeaderboardTableProps) => {
    const { leaderboard, isLoading, error } = useLeaderboard(competitionId)

    if (isLoading) return <Skeleton className="h-48" />

    if (error) return <p className="text-sm text-destructive">Failed to load leaderboard.</p>

    if (!leaderboard?.entries.length) return <p className="text-sm text-muted-foreground">No entries yet.</p>

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead className="text-right">GW Points</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {leaderboard.entries.map((entry) => (
                    <TableRow
                        key={entry.fantasyTeamId}
                        className={entry.userId === currentUserId ? 'bg-muted/50' : ''}
                    >
                        <TableCell className="font-medium">{entry.rank}</TableCell>
                        <TableCell>
                            <div>
                                <p className="font-medium">{entry.userName}</p>
                                <p className="text-xs text-muted-foreground">{entry.fantasyTeamName}</p>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">{entry.gameweekPoints}</TableCell>
                        <TableCell className="text-right font-bold">{entry.totalPoints}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
