export interface PaymentTokenRecord {
    id: string
    userId: string
    token: string
    gatewayUid: string | null
    status: string
    amountCents: number
    currency: string
    coinAmount: number
    description: string
    createdAt: Date
    updatedAt: Date
}

export interface CreatePaymentData {
    userId: string
    token: string
    amountCents: number
    currency: string
    coinAmount: number
    description: string
}

export interface IPaymentRepository {
    create(data: CreatePaymentData): Promise<PaymentTokenRecord>
    findByToken(token: string): Promise<PaymentTokenRecord | null>
    findById(id: string): Promise<PaymentTokenRecord | null>
    updateStatus(id: string, status: string, gatewayUid?: string): Promise<PaymentTokenRecord>
    findByUserId(userId: string): Promise<PaymentTokenRecord[]>
}
