'use client'

import {
    AccountSetting01Icon,
    Coins01Icon,
    DashboardSquare01Icon,
    FootballPitchIcon,
    GlobalIcon,
    NoteEditIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
        items: [
            { title: 'Profile', icon: AccountSetting01Icon, href: '/profile' },
            { title: 'Wallet', icon: Coins01Icon, href: '/wallet' },
        ],
    },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()

    return (
        <Sidebar collapsible="icon" className="h-[98vh] rounded-2xl !top-[1vh] !bottom-auto" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" tooltip="Premier Fantasy">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                <HugeiconsIcon icon={FootballPitchIcon} size={16} />
                            </div>
                            <div className="flex flex-col gap-0.5 leading-none">
                                <span className="font-semibold">Premier Fantasy</span>
                                <span className="text-xs text-muted-foreground">Premier League</span>
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
                                            <SidebarMenuButton
                                                tooltip={item.title}
                                                isActive={
                                                    pathname === item.href ||
                                                    pathname.startsWith(item.href + '/')
                                                }
                                            >
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
