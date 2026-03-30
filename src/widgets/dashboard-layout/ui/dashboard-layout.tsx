'use client'

import { AppSidebar } from '@/widgets/sidebar'

import { Separator } from '@/shared/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/ui/sidebar'
import { TooltipProvider } from '@/shared/ui/tooltip'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />

                <SidebarInset className="h-[98vh] my-auto gap-3">
                    {/* <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-sidebar border w-full max-w-[98%] rounded-2xl mx-auto">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-full" />
                        <h1 className="text-md tracking-wide">Dashboard</h1>
                    </header> */}
                    <div className="flex-1 p-4 border max-w-[98%] w-full rounded-2xl mx-auto">{children}</div>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    )
}
