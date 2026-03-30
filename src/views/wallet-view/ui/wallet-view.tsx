'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { useWallet, walletService } from '@/entities/wallet'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

import type { TransactionType } from '@/entities/wallet'

const COIN_PACKAGES = [100, 500, 1000] as const

const AI_FEATURES = [
    { name: 'AI Transfer Suggestions', cost: 50 },
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
    const [loadingAction, setLoadingAction] = useState<string | null>(null)

    const handlePurchase = async (amount: number) => {
        setLoadingAction(`purchase-${amount}`)

        try {
            await walletService.purchaseCoins(amount)
            await mutate()
            toast.success(`Purchased ${amount} coins`)
        } catch {
            toast.error('Failed to purchase coins')
        } finally {
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
                <h2 className="text-lg font-semibold">Wallet</h2>
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

            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Buy Coins</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {COIN_PACKAGES.map((amount) => (
                            <Button
                                key={amount}
                                variant="outline"
                                disabled={loadingAction === `purchase-${amount}`}
                                onClick={() => handlePurchase(amount)}
                            >
                                {loadingAction === `purchase-${amount}` ? 'Buying...' : `${amount} coins`}
                            </Button>
                        ))}
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
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={
                                        balance < feature.cost || loadingAction === `spend-${feature.name}`
                                    }
                                    onClick={() => handleSpend(feature.name, feature.cost)}
                                >
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
        </div>
    )
}
