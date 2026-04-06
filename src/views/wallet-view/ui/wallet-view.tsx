'use client'

import { AiBrain01Icon, Coins01Icon, GoldBuyIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

import { useTransferSuggestions, TransferSuggestionsModal } from '@/features/ai'

import { useFantasyTeams } from '@/entities/fantasy-team'
import { useWallet, walletService } from '@/entities/wallet'
import type { ICoinPack, TransactionType } from '@/entities/wallet'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const AI_FEATURES = [
    { name: 'Advanced Player Analytics', cost: 100 },
    { name: 'Match Prediction Insights', cost: 75 },
] as const

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
    const { fantasyTeams } = useFantasyTeams()
    const [loadingAction, setLoadingAction] = useState<string | null>(null)
    const searchParams = useSearchParams()

    const fantasyTeamId = fantasyTeams?.[0]?.id
    const transferSuggestions = useTransferSuggestions(fantasyTeamId)

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

    const handleBuyCoins = async (coinAmount: number) => {
        setLoadingAction(`buy-${coinAmount}`)

        try {
            const result = await walletService.createCheckout(coinAmount)

            window.location.href = result.redirectUrl
        } catch {
            toast.error('Failed to start checkout. Please try again.')
            setLoadingAction(null)
        }
    }

    const handleSpend = async (featureName: string, cost: number) => {
        setLoadingAction(`spend-${featureName}`)

        try {
            await walletService.spendCoins(cost, featureName)
            await mutate()
            toast.success(`Unlocked ${featureName}`)
        } catch {
            toast.error('Insufficient coins or purchase failed')
        } finally {
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

            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Buy Coins</CardTitle>
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
                                            ${(pack.priceCents / 100).toFixed(2)}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        disabled={loadingAction === `buy-${pack.coins}`}
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
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">AI Transfer Suggestions</p>
                                <p className="text-xs text-muted-foreground">
                                    {transferSuggestions.cost} coins
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!transferSuggestions.canAfford || transferSuggestions.isLoading}
                                onClick={transferSuggestions.requestAnalysis}
                            >
                                <HugeiconsIcon icon={AiBrain01Icon} />
                                {transferSuggestions.isLoading ? 'Analyzing...' : 'Use'}
                            </Button>
                        </div>

                        {AI_FEATURES.map((feature) => (
                            <div key={feature.name} className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">{feature.name}</p>
                                    <p className="text-xs text-muted-foreground">{feature.cost} coins</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={
                                        balance < feature.cost || loadingAction === `spend-${feature.name}`
                                    }
                                    onClick={() => handleSpend(feature.name, feature.cost)}
                                >
                                    <HugeiconsIcon icon={AiBrain01Icon} />

                                    {loadingAction === `spend-${feature.name}` ? 'Using...' : 'Use'}
                                </Button>
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
                                        <TableCell className="text-sm">{tx.description}</TableCell>
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

            <TransferSuggestionsModal
                open={transferSuggestions.isOpen}
                onClose={transferSuggestions.closeModal}
                analysis={transferSuggestions.analysis}
                isLoading={transferSuggestions.isLoading}
            />
        </div>
    )
}
