export interface IPaymentService {
    createCheckout(userId: string, coinAmount: number): Promise<{ redirectUrl: string }>
    /** Checkout for a free-chosen amount; coins are derived server-side from the price. */
    createCustomCheckout(userId: string, amountCents: number): Promise<{ redirectUrl: string }>
    handleWebhook(
        rawBody: string,
        headers: { authorization: string | null; signature: string | null },
    ): Promise<void>
    reconcileReturn(trackingId: string): Promise<{ status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' }>
}
