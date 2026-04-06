'use client'

import { useSession } from '@/shared/lib/auth-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/shared/ui/sidebar'
import { Skeleton } from '@/shared/ui/skeleton'

import { useUser } from '../model/use-user'

export const UserCard = () => {
    const { data: session } = useSession()
    const { user, isLoading, error } = useUser(session?.user?.id)

    if (isLoading || !user) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="flex flex-col gap-1">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-2.5 w-28" />
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

    if (error) return null

    const { name, email, image } = user

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" tooltip={name}>
                    <Avatar className="size-8">
                        <AvatarImage src={image ?? undefined} />
                        <AvatarFallback className="uppercase text-primary font-bold text-xs">
                            {name.slice(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 leading-none">
                        <span className="text-sm font-medium">{name}</span>
                        <span className="text-xs text-muted-foreground truncate">{email}</span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
