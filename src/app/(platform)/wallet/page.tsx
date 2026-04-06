import { Suspense } from 'react'

import { WalletView } from '@/views/wallet-view'

import { Skeleton } from '@/shared/ui/skeleton'

export default function WalletPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96" />}>
            <WalletView />
        </Suspense>
    )
}
