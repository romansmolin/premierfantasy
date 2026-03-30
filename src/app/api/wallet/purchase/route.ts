import { WalletController } from '@/server/wallet/controller/wallet.controller'
import { WalletRepository } from '@/server/wallet/repository/wallet.repository'
import { WalletService } from '@/server/wallet/service/wallet.service'

import type { NextRequest } from 'next/server'

const walletRepository = new WalletRepository()
const walletService = new WalletService(walletRepository)
const walletController = new WalletController(walletService)

export async function POST(req: NextRequest) {
    return walletController.purchase(req)
}
