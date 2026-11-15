export const dynamic = 'force-dynamic'

import { PaymentStatusPage } from '@/views/payment-return'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Payment Failed',
    description: 'Your Credit purchase could not be completed.',
    robots: { index: false, follow: false },
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const FailedPage = async ({ searchParams }: { searchParams: SearchParams }) => {
    const resolved = await searchParams
    const raw = resolved?.token
    const token = Array.isArray(raw) ? raw[0] : raw
    return <PaymentStatusPage status="failed" token={token} />
}

export default FailedPage
