import type { CheckoutCustomer } from '@/shared/model/checkout-customer'

export interface IPaymentService {
    createCheckout(
        userId: string,
        coinAmount: number,
        customer: CheckoutCustomer,
    ): Promise<{ redirectUrl: string }>
    /** Checkout for a free-chosen amount; coins are derived server-side from the price. */
    createCustomCheckout(
        userId: string,
        amountCents: number,
        customer: CheckoutCustomer,
    ): Promise<{ redirectUrl: string }>
    getPaymentForUser(
        userId: string,
        paymentId: string,
    ): Promise<{
        id: string
        status: string
        amountCents: number
        currency: string
        coinAmount: number
        createdAt: Date
        updatedAt: Date
        withdrawalConsentAt: Date | null
        withdrawalConsentText: string | null
    }>
    handleWebhook(
        rawBody: string,
        headers: { authorization: string | null; signature: string | null },
    ): Promise<void>
    reconcileReturn(trackingId: string): Promise<{ status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' }>
}
