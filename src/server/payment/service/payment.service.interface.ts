export interface IPaymentService {
    createCheckout(userId: string, coinAmount: number): Promise<{ redirectUrl: string }>
    handleWebhook(rawBody: string, signature: string): Promise<void>
}
