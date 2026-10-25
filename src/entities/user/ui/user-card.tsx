'use client'

import { Logout01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { signOut, useSession } from '@/shared/lib/auth-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/shared/ui/sidebar'
import { Skeleton } from '@/shared/ui/skeleton'

import { useUser } from '../model/use-user'

export const UserCard = () => {
    const { data: session, isPending } = useSession()
    const { user, isLoading, error } = useUser(session?.user?.id)
    const [isSigningOut, setIsSigningOut] = useState(false)

    const handleSignOut = async () => {
        setIsSigningOut(true)

        try {
            const { error: signOutError } = await signOut()

            if (signOutError) {
                toast.error(signOutError.message || 'Could not sign out. Please try again.')
                setIsSigningOut(false)

                return
            }

            window.location.replace('/sign-in')
        } catch {
            toast.error('Could not sign out. Please try again.')
            setIsSigningOut(false)
        }
    }

    if (isPending || isLoading) {
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

    if (error || !session || !user) return null

    const { name, email, image } = user

    return (
        <>
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

            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Sign out" onClick={handleSignOut} disabled={isSigningOut}>
                        <HugeiconsIcon icon={Logout01Icon} size={16} />
                        <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </>
    )
}
