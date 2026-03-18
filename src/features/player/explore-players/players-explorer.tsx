'use client'

import Image from 'next/image'

import { useTeamPlayers } from '@/entities/team'

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/table'

export const PlayersExplorer = () => {
    const { players } = useTeamPlayers()

    if (players.length === 0) {
        return <p className="text-sm text-muted-foreground">Select teams to see their players</p>
    }

    return (
        <div className="flex flex-col gap-3">
            <Table>
                <TableCaption>
                    {players.length} player{players.length !== 1 && 's'} from selected teams
                </TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-60">Player</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead className="text-right">Number</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {players.map((player) => (
                        <TableRow key={player.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Image
                                        src={player.photo}
                                        alt={player.name}
                                        width={300}
                                        height={300}
                                        className="size-10 rounded-full object-cover"
                                    />
                                    <span className="font-medium">{player.name}</span>
                                </div>
                            </TableCell>
                            <TableCell>{player.position}</TableCell>
                            <TableCell>{player.age ?? '—'}</TableCell>
                            <TableCell className="text-right">{player.number ?? '—'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
