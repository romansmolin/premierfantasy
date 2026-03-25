'use client'

import Link from 'next/link'

import type { ICompetition } from '@/entities/competition'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface CompetitionCardProps {
    competition: ICompetition
}

const statusVariant = {
    upcoming: 'outline' as const,
    active: 'default' as const,
    completed: 'secondary' as const,
}

export const CompetitionCard = ({ competition }: CompetitionCardProps) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>{competition.name}</CardTitle>
                    <Badge variant={statusVariant[competition.status]}>{competition.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    GW {competition.startGameweek} &rarr; GW {competition.endGameweek}
                </p>
                <Link href={`/competitions/${competition.id}`}>
                    <Button variant="outline" size="sm">
                        View Competition
                    </Button>
                </Link>
            </CardContent>
        </Card>
    )
}
