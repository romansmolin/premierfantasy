'use client'

import type { ISquadPlayerWithStats } from '@/entities/fantasy-team'

import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

interface GameweekDetailTableProps {
    players: ISquadPlayerWithStats[]
}

export const GameweekDetailTable = ({ players }: GameweekDetailTableProps) => {
    const totalPoints = players.reduce((sum, p) => sum + (p.stats?.totalPoints ?? 0), 0)

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Pos</TableHead>
                    <TableHead className="text-right">Mins</TableHead>
                    <TableHead className="text-right">G</TableHead>
                    <TableHead className="text-right">A</TableHead>
                    <TableHead className="text-right">CS</TableHead>
                    <TableHead className="text-right">YC</TableHead>
                    <TableHead className="text-right">RC</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {players.map((player) => (
                    <TableRow key={player.externalId}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>{player.position}</TableCell>
                        <TableCell className="text-right">{player.stats?.minutesPlayed ?? '-'}</TableCell>
                        <TableCell className="text-right">{player.stats?.goals ?? '-'}</TableCell>
                        <TableCell className="text-right">{player.stats?.assists ?? '-'}</TableCell>
                        <TableCell className="text-right">
                            {player.stats ? (player.stats.cleanSheet ? 'Yes' : 'No') : '-'}
                        </TableCell>
                        <TableCell className="text-right">{player.stats?.yellowCards ?? '-'}</TableCell>
                        <TableCell className="text-right">{player.stats?.redCards ?? '-'}</TableCell>
                        <TableCell className="text-right font-bold">
                            {player.stats?.totalPoints ?? '-'}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={8}>Total</TableCell>
                    <TableCell className="text-right font-bold">{totalPoints}</TableCell>
                </TableRow>
            </TableFooter>
        </Table>
    )
}
