'use client'

import useSWR from 'swr'

import { fantasyTeamService } from '@/entities/fantasy-team'

import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

interface TransferInfoBannerProps {
    teamId: string
}

export const TransferInfoBanner = ({ teamId }: TransferInfoBannerProps) => {
    const { data, isLoading } = useSWR(teamId ? `/api/fantasy-teams/${teamId}/transfers` : null, () =>
        fantasyTeamService.getTransferInfo(teamId),
    )

    if (isLoading) return <Skeleton className="h-16" />

    if (!data) return null

    const deadlineStr = data.deadline
        ? new Date(data.deadline).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
          })
        : 'No deadline set'

    return (
        <Card className="border-dashed">
            <CardContent className="flex items-center justify-between py-3 text-sm">
                <span>Deadline: {deadlineStr}</span>
                <span>Free transfers: {data.freeTransfers}</span>
                <span>Transfers made: {data.transfersMade}</span>
                <span className={data.pointsCost > 0 ? 'text-destructive font-medium' : ''}>
                    Points cost: {data.pointsCost > 0 ? `-${data.pointsCost}` : '0'}
                </span>
            </CardContent>
        </Card>
    )
}
