import { afterEach, describe, expect, it, vi } from 'vitest'

describe('hosted checkout customer details', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.resetModules()
    })

    it('sends the entered customer details to the processor for checkout', async () => {
        vi.stubEnv('SECURE_PROCESSOR_API_BASE_URL', 'https://processor.example.test')
        vi.stubEnv('SECURE_PROCESSOR_SHOP_ID', 'test-shop')
        vi.stubEnv('SECURE_PROCESSOR_SECRET_KEY', 'test-secret')
        vi.stubEnv('SECURE_PROCESSOR_PUBLIC_KEY', 'test-key')
        vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.test')
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                checkout: { token: 'token', redirect_url: 'https://processor.example.test/pay' },
            }),
        })

        vi.stubGlobal('fetch', fetchMock)
        const { secureProcessorClient } = await import('./secure-processor-client')

        await secureProcessorClient.createCheckout({
            amountCents: 200,
            currency: 'EUR',
            description: 'Coins',
            trackingId: 'payment-1',
            userId: 'user-1',
            customer: {
                firstName: 'Alex',
                lastName: 'Smith',
                email: 'alex@example.test',
                phone: '+48123456789',
                address: 'Example Street 1',
                city: 'Warsaw',
                country: 'pl',
                zip: '00-001',
                birthDate: '1990-01-01',
            },
        })

        const body = JSON.parse(fetchMock.mock.calls[0][1].body)

        expect(body.checkout.customer).toEqual({
            external_id: 'user-1',
            email: 'alex@example.test',
            first_name: 'Alex',
            last_name: 'Smith',
            phone: '+48123456789',
            address: 'Example Street 1',
            city: 'Warsaw',
            country: 'PL',
            zip: '00-001',
            birth_date: '1990-01-01',
        })
    })
})
