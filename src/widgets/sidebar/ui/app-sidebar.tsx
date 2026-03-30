'use client'

import {
    AnalyticsUpIcon,
    Coins01Icon,
    DashboardSquare01Icon,
    GlobalIcon,
    NoteEditIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { UserCard } from '@/entities/user'

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/shared/ui/sidebar'

const navGroups = [
    {
        label: 'Overview',
        items: [{ title: 'Dashboard', icon: DashboardSquare01Icon, href: '/dashboard' }],
    },
    {
        label: 'Fantasy',
        items: [
            { title: 'Competitions', icon: GlobalIcon, href: '/competitions' },
            { title: 'Team Builder', icon: NoteEditIcon, href: '/fantasy-team-builder' },
        ],
    },
    {
        label: 'Account',
        items: [{ title: 'Wallet', icon: Coins01Icon, href: '/wallet' }],
    },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" className="h-[98vh] rounded-2xl !top-[1vh] !bottom-auto" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" tooltip="Analytics">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                <HugeiconsIcon icon={AnalyticsUpIcon} size={16} />
                            </div>
                            <div className="flex flex-col gap-0.5 leading-none">
                                <span className="font-semibold">Analytics</span>
                                <span className="text-xs text-muted-foreground">Fantasy Football</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {navGroups.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <Link href={item.href}>
                                            <SidebarMenuButton tooltip={item.title}>
                                                <HugeiconsIcon icon={item.icon} size={16} />
                                                <span>{item.title}</span>
                                            </SidebarMenuButton>
                                        </Link>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter>
                <UserCard />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
