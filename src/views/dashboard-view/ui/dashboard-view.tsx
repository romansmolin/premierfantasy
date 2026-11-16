'use client'

import { Coins01Icon, DashboardSquare01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { useWallet } from '@/entities/wallet'

import { useSession } from '@/shared/lib/auth-client'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

import { UpcomingFixtures } from './upcoming-fixtures'

export function DashboardView() {
    const { data: session } = useSession()
    const { balance, isLoading } = useWallet()

    const userName = session?.user?.name ?? 'there'

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
                    <HugeiconsIcon icon={DashboardSquare01Icon} size={20} className="text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-bold">Welcome, {userName}</h2>
                    <p className="text-sm text-muted-foreground">Fixtures, stats and AI insights</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 shrink-0">
                            <HugeiconsIcon icon={Coins01Icon} size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <CardTitle>{isLoading ? '…' : `${balance} Credits`}</CardTitle>
                            <CardDescription>
                                Credits pay for auto-build, squad review, player analysis and match
                                predictions.
                            </CardDescription>
                        </div>
                        <Link href="/wallet" className={buttonVariants({ variant: 'outline' })}>
                            Get Credits
                        </Link>
                    </div>
                </CardHeader>
            </Card>

            <UpcomingFixtures />
        </div>
    )
}
