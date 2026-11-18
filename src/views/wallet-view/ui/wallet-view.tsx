'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Coins01Icon, GoldBuyIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import useSWR from 'swr'

import { BillingDetailsCard, CustomTopupCard } from '@/features/wallet'

import { AI_FEATURE_LABELS, AI_FEATURE_PRICES } from '@/entities/ai'
import { billingService, sameCustomer, useBillingProfile } from '@/entities/billing'
import { useWallet, walletService, WITHDRAWAL_CONSENT_TEXT, checkoutCustomerSchema } from '@/entities/wallet'
import type { CheckoutCustomer, ICoinPack, TransactionType } from '@/entities/wallet'

import { ApiError } from '@/shared/api/api-error'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const AI_FEATURES = (Object.keys(AI_FEATURE_PRICES) as (keyof typeof AI_FEATURE_PRICES)[]).map((feature) => ({
    name: AI_FEATURE_LABELS[feature],
    cost: AI_FEATURE_PRICES[feature],
}))

const typeBadgeVariant: Record<TransactionType, 'default' | 'secondary' | 'outline'> = {
    COMPETITION_REWARD: 'default',
    PURCHASE: 'secondary',
    AI_FEATURE_SPEND: 'outline',
}

const typeLabel: Record<TransactionType, string> = {
    COMPETITION_REWARD: 'Bonus',
    PURCHASE: 'Purchase',
    AI_FEATURE_SPEND: 'AI Feature',
}

export const WalletView = () => {
    const { balance, transactions, isLoading, mutate } = useWallet()
    const [withdrawalConsent, setWithdrawalConsent] = useState(false)
    const [loadingAction, setLoadingAction] = useState<string | null>(null)
    const searchParams = useSearchParams()
    const customerForm = useForm<CheckoutCustomer>({
        resolver: zodResolver(checkoutCustomerSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            country: '',
            zip: '',
            birthDate: '',
        },
    })

    const { profile: savedProfile, mutate: mutateProfile } = useBillingProfile()
    const { reset, formState } = customerForm
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const values = customerForm.watch()
    const isSaved = savedProfile !== null && sameCustomer(savedProfile, values)

    // Prefill saved details, but never overwrite what the user is already typing.
    useEffect(() => {
        if (savedProfile && !formState.isDirty) reset(savedProfile)
    }, [savedProfile, formState.isDirty, reset])

    const { data: coinPacks, isLoading: isPacksLoading } = useSWR<ICoinPack[]>('/api/wallet/packs', () =>
        walletService.getCoinPacks(),
    )

    useEffect(() => {
        const payment = searchParams.get('payment')

        if (payment === 'success') {
            toast.success('Payment successful! Credits have been added to your balance.')
            mutate()
        } else if (payment === 'declined') {
            toast.error('Payment was declined. Please try again.')
        } else if (payment === 'failed') {
            toast.error('Payment failed. Please try again.')
        } else if (payment === 'cancelled') {
            toast.info('Payment was cancelled.')
        }
    }, [searchParams, mutate])

    const persistCustomer = async (customer: CheckoutCustomer): Promise<boolean> => {
        setIsSaving(true)
        setSaveError(null)

        try {
            const saved = await billingService.saveProfile(customer)

            await mutateProfile(saved, { revalidate: false })
            reset(customer)

            return true
        } catch (error) {
            setSaveError(
                ApiError.isApiError(error) && error.status < 500
                    ? error.message
                    : 'Could not save your details. Please try again later.',
            )

            return false
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveDetails = async () => {
        if (!(await customerForm.trigger(undefined, { shouldFocus: true }))) return

        const result = checkoutCustomerSchema.safeParse(customerForm.getValues())

        if (result.success && (await persistCustomer(result.data))) toast.success('Billing details saved')
    }

    const getCustomer = async (): Promise<CheckoutCustomer | null> => {
        if (!(await customerForm.trigger(undefined, { shouldFocus: true }))) return null

        const result = checkoutCustomerSchema.safeParse(customerForm.getValues())

        if (!result.success) return null

        // Remember the details for next time; a failed save must not block the payment.
        if (!savedProfile || !sameCustomer(savedProfile, result.data)) {
            // Awaited so the request is not cut off by the redirect to the payment page.
            if (!(await persistCustomer(result.data))) {
                toast.warning('Could not save your billing details for next time.')
            }
        }

        return result.data
    }

    const handleBuyCoins = async (coinAmount: number) => {
        const customer = await getCustomer()

        if (!customer) return

        setLoadingAction(`buy-${coinAmount}`)

        try {
            const result = await walletService.createCheckout(coinAmount, customer)

            window.location.assign(result.redirectUrl)
        } catch {
            toast.error('Failed to start checkout. Please try again.')
            setLoadingAction(null)
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-muted-foreground">Manage your Credits</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Your Balance</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{balance.toLocaleString()} Credits</p>
                </CardContent>
            </Card>

            {balance === 0 && transactions.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex items-center justify-center size-12 rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
                            <HugeiconsIcon
                                icon={Coins01Icon}
                                size={20}
                                className="text-amber-600 dark:text-amber-400"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-1">Get started with Credits</p>
                            <p className="text-xs text-muted-foreground">
                                Buy Credits to unlock AI-powered features like player analysis and match
                                predictions. Credits never expire.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <BillingDetailsCard
                control={customerForm.control}
                register={customerForm.register}
                errors={customerForm.formState.errors}
                onSave={handleSaveDetails}
                isSaving={isSaving}
                isSaved={isSaved}
                saveError={saveError}
            />
            <div className="flex items-start gap-3 rounded-xl border p-4">
                <Checkbox
                    id="withdrawal-consent"
                    checked={withdrawalConsent}
                    onCheckedChange={setWithdrawalConsent}
                />
                <label htmlFor="withdrawal-consent" className="text-sm leading-relaxed">
                    {WITHDRAWAL_CONSENT_TEXT} See the{' '}
                    <a className="underline" href="/return-policy" target="_blank" rel="noreferrer">
                        Return &amp; Refund Policy
                    </a>
                    .
                </label>
            </div>
            <CustomTopupCard withdrawalConsent={withdrawalConsent} getCustomer={getCustomer} />

            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Credit Packs</CardTitle>
                        <CardDescription>Fixed bundles at the same rate as a custom top-up.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {isPacksLoading ? (
                            <Skeleton className="h-24" />
                        ) : (
                            coinPacks?.map((pack) => (
                                <div key={pack.coins} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{pack.coins} Credits</p>
                                        <p className="text-xs text-muted-foreground">
                                            &euro;{(pack.priceCents / 100).toFixed(2)}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        disabled={!withdrawalConsent || loadingAction === `buy-${pack.coins}`}
                                        onClick={() => handleBuyCoins(pack.coins)}
                                        className={'flex gap-1'}
                                    >
                                        <HugeiconsIcon icon={GoldBuyIcon} />
                                        {loadingAction === `buy-${pack.coins}` ? 'Processing...' : 'Buy'}
                                    </Button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>AI Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {AI_FEATURES.map((feature) => (
                            <div key={feature.name} className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">{feature.name}</p>
                                    <p className="text-xs text-muted-foreground">{feature.cost} Credits</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    {transactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No transactions yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-sm">
                                            {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={typeBadgeVariant[tx.type]}>
                                                {typeLabel[tx.type]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {tx.description}
                                            {tx.paymentTokenId && (
                                                <a
                                                    className="ml-2 underline"
                                                    href={`/api/payments/secure-processor/${encodeURIComponent(tx.paymentTokenId)}/receipt`}
                                                >
                                                    Download confirmation
                                                </a>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-medium ${
                                                tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                                            }`}
                                        >
                                            {tx.amount > 0 ? '+' : ''}
                                            {tx.amount}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
