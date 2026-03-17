import React from 'react'

import { useSession } from '@/shared/lib/auth-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Card, CardContent } from '@/shared/ui/card'

import { useUser } from '../model/use-user'

export const UserCard = () => {
    const { data: session } = useSession()

    const { user } = useUser(session?.user?.id)

    if (!user) return

    const { name, email } = user.userInfo

    if (!user) return

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
