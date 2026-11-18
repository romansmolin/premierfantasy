'use client'

import useSWR from 'swr'

import { useSession } from '@/shared/lib/auth-client'

import { billingService } from '../api/billing.service'

export const useBillingProfile = () => {
    const { data: session } = useSession()
    const { data, isLoading, mutate } = useSWR(
        session?.user?.id ? '/api/billing/profile' : null,
        () => billingService.getProfile(),
        { revalidateOnFocus: false },
    )

    return { profile: data ?? null, isLoading, mutate }
}
