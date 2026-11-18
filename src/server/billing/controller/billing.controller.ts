import { NextResponse } from 'next/server'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { parseJson, withController } from '@/shared/lib/http'
import { checkoutCustomerSchema } from '@/shared/model/checkout-customer'

import type { IBillingService } from '../service/billing.service.interface'

// Personal data: keep it out of shared caches.
const privateJson = (body: unknown) =>
    NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store' } })

export class BillingController {
    private readonly billingService: IBillingService

    constructor(billingService: IBillingService) {
        this.billingService = billingService
    }

    getProfile = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return privateJson({ profile: await this.billingService.getProfile(userId) })
    })

    saveProfile = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const customer = await parseJson(req, checkoutCustomerSchema)

        return privateJson({ profile: await this.billingService.saveProfile(userId, customer) })
    })
}
