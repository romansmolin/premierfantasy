import { PaymentController } from '@/server/payment/controller/payment.controller'
import { PaymentRepository } from '@/server/payment/repository/payment.repository'
import { PaymentService } from '@/server/payment/service/payment.service'
import { WalletRepository } from '@/server/wallet/repository/wallet.repository'

const paymentRepository = new PaymentRepository()
const walletRepository = new WalletRepository()
const paymentService = new PaymentService(paymentRepository, walletRepository)
const paymentController = new PaymentController(paymentService)

export const container = {
    paymentController,
} as const
