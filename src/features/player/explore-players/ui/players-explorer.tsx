'use client'

import Image from 'next/image'

import { generatePlayerPrice, mapApiPosition } from '@/entities/players'
import { useTeamPlayers } from '@/entities/team'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { ScrollArea, ScrollBar } from '@/shared/ui/scroll-area'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/table'

import { getPositionBadgeClass } from '../lib/position-badge-variant'
import { SelectPlayerCheckbox } from '../../select-player/ui/select-player-checkbox'
import { usePlayersExplorer } from '../model/use-players-explorer'

const POSITIONS = [
    { label: 'GK', value: 'Goalkeeper' },
    { label: 'DEF', value: 'Defender' },
    { label: 'MID', value: 'Midfielder' },
    { label: 'FWD', value: 'Attacker' },
] as const

export const PlayersExplorer = () => {
    const { playersByTeam } = useTeamPlayers()
    const {
        teams,
        playersFilter,
        setFilterPlayerName,
        setFilterPlayerPosition,
        setFilterPlayerClub,
        filteredPlayers,
        filteredCount,
        selectTeam,
        selectedTeamsIds,
        teamLookup,
    } = usePlayersExplorer(playersByTeam)

    return (
        <div className="flex flex-col gap-3 ">
            <ScrollArea className="w-full no-scrollbar">
                <div className="flex gap-3 p-2 ">
                    {teams.map(({ team }) => (
                        <Card
                            key={team.code}
                            onClick={() => selectTeam(team.id)}
                            className={cn(
                                'flex shrink-0 size-20 items-center justify-between hover:bg-primary duration-300 cursor-pointer',
                                selectedTeamsIds.includes(team.id) && 'bg-primary',
                            )}
                        >
                            <CardContent className="size-full flex items-center justify-between">
                                <Image
                                    src={team.logo}
                                    alt={`${team.name} logo`}
                                    width={300}
                                    height={300}
                                    className="object-contain size-full"
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className={'hidden!'} />
            </ScrollArea>

            <div className="flex flex-col gap-3">
                <Input
                    value={playersFilter.playerName}
                    onChange={(e) => setFilterPlayerName(e.target.value)}
                    placeholder="Search by player name..."
                />

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Position:</span>
                    {POSITIONS.map(({ label, value }) => (
                        <Badge
                            key={value}
                            className={cn(
                                'cursor-pointer transition-all',
                                getPositionBadgeClass(value),
                                playersFilter.playerPosition === value
                                    ? 'ring-2 ring-ring'
                                    : 'opacity-50 hover:opacity-80',
                            )}
                            onClick={() =>
                                setFilterPlayerPosition(playersFilter.playerPosition === value ? '' : value)
                            }
                        >
                            {label}
                        </Badge>
                    ))}

                    {selectedTeamsIds.length > 1 && (
                        <>
                            <span className="mx-1 h-4 w-px bg-border" />
                            <span className="text-xs font-medium text-muted-foreground">Club:</span>
                            {selectedTeamsIds.map((id) => {
                                const team = teamLookup[id.toString()]

                                if (!team) return null

                                return (
                                    <Badge
                                        key={id}
                                        variant="outline"
                                        className={cn(
                                            'cursor-pointer transition-all',
                                            playersFilter.playerClub === id.toString()
                                                ? 'ring-2 ring-ring bg-accent'
                                                : 'hover:bg-accent/50',
                                        )}
                                        onClick={() =>
                                            setFilterPlayerClub(
                                                playersFilter.playerClub === id.toString()
                                                    ? ''
                                                    : id.toString(),
                                            )
                                        }
                                    >
                                        {team.name}
                                    </Badge>
                                )
                            })}
                        </>
                    )}

                    {(playersFilter.playerPosition || playersFilter.playerClub) && (
                        <>
                            <span className="mx-1 h-4 w-px bg-border" />
                            <button
                                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                                onClick={() => {
                                    setFilterPlayerPosition('')
                                    setFilterPlayerClub('')
                                }}
                            >
                                Clear filters
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="max-h-[60vh] overflow-auto">
                <Table>
                    <TableCaption>
                        {filteredCount} player{filteredCount !== 1 && 's'} from selected teams
                    </TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-40">Player</TableHead>
                            <TableHead className="min-w-28">Club</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Age</TableHead>
                            <TableHead className="text-right">Number</TableHead>
                            <TableHead className="w-10"></TableHead>
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
                                    <TableCell className="truncate max-w-32">
                                        {teamLookup[teamId]?.name ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getPositionBadgeClass(player.position)}>
                                            {mapApiPosition(player.position)}
                                        </Badge>
                                    </TableCell>
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
        </div>
    )
}
