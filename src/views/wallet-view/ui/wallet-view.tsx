'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Coins01Icon, GoldBuyIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import useSWR from 'swr'

import { CustomTopupCard } from '@/features/wallet'

import { AI_FEATURE_LABELS, AI_FEATURE_PRICES } from '@/entities/ai'
import { useWallet, walletService, WITHDRAWAL_CONSENT_TEXT, checkoutCustomerSchema } from '@/entities/wallet'
import type { CheckoutCustomer, ICoinPack, TransactionType } from '@/entities/wallet'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const CUSTOMER_FIELDS = [
    { name: 'firstName', label: 'First name', autoComplete: 'given-name' },
    { name: 'lastName', label: 'Last name', autoComplete: 'family-name' },
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
    { name: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel' },
    { name: 'address', label: 'Billing address', autoComplete: 'street-address' },
    { name: 'city', label: 'City', autoComplete: 'address-level2' },
    { name: 'country', label: 'Country code', autoComplete: 'country', placeholder: 'e.g. PL' },
    { name: 'zip', label: 'Postal code', autoComplete: 'postal-code' },
    { name: 'birthDate', label: 'Date of birth (optional)', type: 'date', autoComplete: 'bday' },
] as const

const AI_FEATURES = (['PLAYER_ANALYSIS', 'MATCH_PREDICTION'] as const).map((feature) => ({
    name: AI_FEATURE_LABELS[feature],
    cost: AI_FEATURE_PRICES[feature],
}))

const typeBadgeVariant: Record<TransactionType, 'default' | 'secondary' | 'outline'> = {
    COMPETITION_REWARD: 'default',
    PURCHASE: 'secondary',
    AI_FEATURE_SPEND: 'outline',
}

const typeLabel: Record<TransactionType, string> = {
    COMPETITION_REWARD: 'Reward',
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

    const { data: coinPacks, isLoading: isPacksLoading } = useSWR<ICoinPack[]>('/api/wallet/packs', () =>
        walletService.getCoinPacks(),
    )

    useEffect(() => {
        const payment = searchParams.get('payment')

        if (payment === 'success') {
            toast.success('Payment successful! Coins have been added to your wallet.')
            mutate()
        } else if (payment === 'declined') {
            toast.error('Payment was declined. Please try again.')
        } else if (payment === 'failed') {
            toast.error('Payment failed. Please try again.')
        } else if (payment === 'cancelled') {
            toast.info('Payment was cancelled.')
        }
    }, [searchParams, mutate])

    const getCustomer = async (): Promise<CheckoutCustomer | null> => {
        if (!(await customerForm.trigger(undefined, { shouldFocus: true }))) return null

        const result = checkoutCustomerSchema.safeParse(customerForm.getValues())

        return result.success ? result.data : null
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
                <p className="text-sm text-muted-foreground">Manage your coins</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Your Balance</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{balance.toLocaleString()} coins</p>
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
                            <p className="text-sm font-medium mb-1">Start earning coins</p>
                            <p className="text-xs text-muted-foreground">
                                Place in the top 3 of any competition to earn coins (1st: 500, 2nd: 300, 3rd:
                                100). You can also purchase coins to unlock AI-powered features like transfer
                                suggestions and match predictions.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Billing details</CardTitle>
                    <CardDescription>Enter the details of the person making the payment.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    {CUSTOMER_FIELDS.map((field) => {
                        const error = customerForm.formState.errors[field.name]
                        const id = `billing-${field.name}`

                        return (
                            <div key={field.name} className="space-y-1.5">
                                <label htmlFor={id} className="text-sm font-medium">
                                    {field.label}
                                </label>
                                <Input
                                    id={id}
                                    type={'type' in field ? field.type : 'text'}
                                    autoComplete={field.autoComplete}
                                    placeholder={'placeholder' in field ? field.placeholder : undefined}
                                    aria-invalid={Boolean(error)}
                                    aria-describedby={error ? `${id}-error` : undefined}
                                    {...customerForm.register(field.name)}
                                />
                                {error && (
                                    <p id={`${id}-error`} className="text-sm text-destructive">
                                        {error.message}
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
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
                        <CardTitle>Coin Packs</CardTitle>
                        <CardDescription>Fixed bundles at the same rate as a custom top-up.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {isPacksLoading ? (
                            <Skeleton className="h-24" />
                        ) : (
                            coinPacks?.map((pack) => (
                                <div key={pack.coins} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{pack.coins} coins</p>
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
                                    <p className="text-xs text-muted-foreground">{feature.cost} coins</p>
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
