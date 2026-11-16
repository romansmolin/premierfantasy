'use client'

import { usePathname } from 'next/navigation'

import { AppSidebar } from '@/widgets/sidebar'

import { Separator } from '@/shared/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/ui/sidebar'
import { TooltipProvider } from '@/shared/ui/tooltip'

const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/players': 'Players',
    '/builder': 'Squad builder',
    '/wallet': 'Credits',
    '/profile': 'Profile',
}

function getPageTitle(pathname: string): string {
    if (pageTitles[pathname]) return pageTitles[pathname]

    return 'Premier Fantasy'
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const title = getPageTitle(pathname)

    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />

                <SidebarInset className="h-[98vh] my-auto gap-3">
                    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-sidebar border w-full max-w-[98%] rounded-2xl mx-auto">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-full" />
                        <h1 className="text-md tracking-wide">{title}</h1>
                    </header>
                    <div className="flex-1 p-4 border max-w-[98%] w-full rounded-2xl mx-auto">{children}</div>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    )
}
