import crypto from 'crypto'

interface CheckoutRequest {
    amountCents: number
    currency: string
    description: string
    trackingId: string
    userId: string
}

interface CheckoutResponse {
    token: string
    redirectUrl: string
}

class SecureProcessorClient {
    private readonly baseUrl: string
    private readonly shopId: string
    private readonly secretKey: string
    private readonly testMode: boolean

    constructor() {
        this.baseUrl = process.env.SECURE_PROCESSOR_API_BASE_URL ?? ''
        this.shopId = process.env.SECURE_PROCESSOR_SHOP_ID ?? ''
        this.secretKey = process.env.SECURE_PROCESSOR_SECRET_KEY ?? ''
        this.testMode = process.env.SECURE_PROCESSOR_TEST_MODE === 'true'
    }

    private get authHeader(): string {
        return `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`
    }

    async createCheckout(data: CheckoutRequest): Promise<CheckoutResponse> {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

        const body = {
            checkout: {
                version: 2.1,
                transaction_type: 'payment',
                test: this.testMode,
                payment_method: {
                    types: ['credit_card'],
                },
                settings: {
                    return_url: `${appUrl}/api/payments/return?token=${data.trackingId}`,
                    notification_url: `${appUrl}/api/payments/webhook`,
                    language: 'en',
                },
                order: {
                    amount: data.amountCents,
                    currency: data.currency,
                    description: data.description,
                },
                customer: {
                    id: data.userId,
                },
                metadata: {
                    payment_token_id: data.trackingId,
                    user_id: data.userId,
                },
            },
        }

        const tokenPath = process.env.SECURE_PROCESSOR_CHECKOUT_TOKEN_PATH ?? '/ctp/api/checkouts'

        const res = await fetch(`${this.baseUrl}${tokenPath}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-API-Version': '2',
                Authorization: this.authHeader,
            },
            body: JSON.stringify(body),
        })

        if (!res.ok) {
            const errorText = await res.text()

            throw new Error(`Secure Processor checkout failed: ${res.status} ${errorText}`)
        }

        const json = await res.json()

        console.warn('Checkout response:', JSON.stringify(json, null, 2))

        return {
            token: json.checkout.token,
            redirectUrl: json.checkout.redirect_url,
        }
    }
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const publicKey = process.env.SECURE_PROCESSOR_PUBLIC_KEY

    if (!publicKey) throw new Error('SECURE_PROCESSOR_PUBLIC_KEY not configured')

    const keyLines = publicKey.match(/.{1,64}/g)

    if (!keyLines) throw new Error('Invalid public key format')

    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${keyLines.join('\n')}\n-----END PUBLIC KEY-----`

    return crypto.verify('sha256', Buffer.from(rawBody), publicKeyPem, Buffer.from(signature, 'base64'))
}

export const secureProcessorClient = new SecureProcessorClient()
