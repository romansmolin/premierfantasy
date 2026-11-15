import { describe, expect, it, vi } from 'vitest'

import { WalletService } from './wallet.service'

import type { IWalletRepository } from '../repository/wallet.repository.interface'

function makeRepo(spendResult: boolean) {
    const spendIfSufficient = vi.fn().mockResolvedValue(spendResult)
    const repo = {
        getUserBalance: vi.fn().mockResolvedValue(100),
        createTransaction: vi.fn(),
        getTransactionHistory: vi.fn().mockResolvedValue([]),
        spendIfSufficient,
    } satisfies IWalletRepository

    return { repo, spendIfSufficient }
}

describe('WalletService.spendOnFeature', () => {
    it('charges via spendIfSufficient', async () => {
        const { repo, spendIfSufficient } = makeRepo(true)

        await new WalletService(repo).spendOnFeature('u1', 10, 'Player analysis')

        expect(spendIfSufficient).toHaveBeenCalledWith('u1', 10, 'Spent 10 credits on Player analysis')
    })

    it('throws 402 when balance is insufficient', async () => {
        const { repo } = makeRepo(false)

        await expect(
            new WalletService(repo).spendOnFeature('u1', 10, 'Player analysis'),
        ).rejects.toMatchObject({
            statusCode: 402,
        })
    })

    it('rejects non-positive amounts without touching the repository', async () => {
        const { repo, spendIfSufficient } = makeRepo(true)

        await expect(
            new WalletService(repo).spendOnFeature('u1', 0, 'Player analysis'),
        ).rejects.toMatchObject({
            statusCode: 400,
        })
        expect(spendIfSufficient).not.toHaveBeenCalled()
    })
})
