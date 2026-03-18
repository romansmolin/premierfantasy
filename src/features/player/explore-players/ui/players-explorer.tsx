'use client'

import Image from 'next/image'

import { generatePlayerPrice, mapApiPosition } from '@/entities/players'
import { useTeamPlayers } from '@/entities/team'

import { Input } from '@/shared/ui/input'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/table'

import { SelectPlayerCheckbox } from '../../select-player/ui/select-player-checkbox'
import { usePlayersExplorer } from '../model/use-players-explorer'

export const PlayersExplorer = () => {
    const { players, playersByTeam } = useTeamPlayers()
    const { playersFilter, setFilterPlayerName, filteredPlayers, filteredCount } =
        usePlayersExplorer(playersByTeam)

    if (players.length === 0) {
        return <p className="text-sm text-muted-foreground">Select teams to see their players</p>
    }

    return (
        <div className="flex flex-col gap-3">
            <Input
                value={playersFilter.playerName}
                onChange={(e) => setFilterPlayerName(e.target.value)}
                placeholder="Type player's name"
            />

            <Table>
                <TableCaption>
                    {filteredCount} player{filteredCount !== 1 && 's'} from selected teams
                </TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-50">Player</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead className="text-right">Number</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(filteredPlayers).map(([teamId, teamPlayers]) =>
                        teamPlayers.map((player) => (
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
                                <TableCell>
                                    {generatePlayerPrice(player.id, mapApiPosition(player.position))}m
                                </TableCell>
                                <TableCell>{player.age ?? '—'}</TableCell>
                                <TableCell className="text-right">{player.number ?? '—'}</TableCell>
                                <TableCell className="pl-10">
                                    <SelectPlayerCheckbox player={player} teamId={Number(teamId)} />
                                </TableCell>
                            </TableRow>
                        )),
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
