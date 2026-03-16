'use client'

import {
    AnalyticsUpIcon,
    DashboardSquare01Icon,
    UserMultiple02Icon,
    GlobalIcon,
    ChartLineData02Icon,
    FileExportIcon,
    LinkSquare01Icon,
    AlertCircleIcon,
    NoteEditIcon,
    TaskEdit01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
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
        label: 'Core Pages',
        items: [
            { title: 'User Behavior', icon: UserMultiple02Icon, href: '#', badge: 5 },
            { title: 'Audience', icon: UserMultiple02Icon, href: '#' },
            { title: 'Traffic Sources', icon: GlobalIcon, href: '#', badge: 3 },
            { title: 'Engagement Metrics', icon: ChartLineData02Icon, href: '#' },
            { title: 'Custom Reports', icon: NoteEditIcon, href: '#' },
            { title: 'Error Logs', icon: AlertCircleIcon, href: '#' },
            { title: 'Survey Results', icon: TaskEdit01Icon, href: '#' },
        ],
    },
    {
        label: 'Visualization',
        items: [
            { title: 'Data Export', icon: FileExportIcon, href: '#' },
            { title: 'Integrations', icon: LinkSquare01Icon, href: '#' },
        ],
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
                                        <SidebarMenuButton tooltip={item.title}>
                                            <HugeiconsIcon icon={item.icon} size={16} />
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                        {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
