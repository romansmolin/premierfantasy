export interface IPaymentService {
    createCheckout(userId: string, coinAmount: number): Promise<{ redirectUrl: string }>
    handleWebhook(
        rawBody: string,
        headers: { authorization: string | null; signature: string | null },
    ): Promise<void>
    reconcileReturn(trackingId: string): Promise<{ status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' }>
}
