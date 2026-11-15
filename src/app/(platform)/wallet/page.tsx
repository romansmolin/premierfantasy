import { Suspense } from 'react'

import { WalletView } from '@/views/wallet-view'

import { Skeleton } from '@/shared/ui/skeleton'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Wallet',
    description: 'Your Credit balance, purchase history, and AI feature spending.',
}

export default function WalletPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96" />}>
            <WalletView />
        </Suspense>
    )
}
