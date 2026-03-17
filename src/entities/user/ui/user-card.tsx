import React from 'react'

import { useSession } from '@/shared/lib/auth-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

import { useUser } from '../model/use-user'

export const UserCard = () => {
    const { data: session } = useSession()

    const { user, isLoading, error } = useUser(session?.user?.id)

    if (isLoading || !user) {
        return (
            <Card>
                <CardContent className="flex items-center gap-2">
                    <Skeleton className="h-12 w-12 rounded-full" />

                    <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3.5 w-36" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) return null

    const { name, email } = user

    return (
        <Card>
            <CardContent className="flex items-center gap-2">
                <Avatar className={'p-6'}>
                    <AvatarImage src={''} />
                    <AvatarFallback className="uppercase text-primary font-bold">
                        {name.slice(0, 2)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex flex-col">
                    <p className="text-sm">{name}</p>
                    <p className="text-muted-foreground truncate">{email}</p>
                </div>
            </CardContent>
        </Card>
    )
}
