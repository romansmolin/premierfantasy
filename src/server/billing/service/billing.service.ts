import type { CheckoutCustomer } from '@/shared/model/checkout-customer'

import type { IBillingService } from './billing.service.interface'
import type { IBillingRepository } from '../repository/billing.repository.interface'


export class BillingService implements IBillingService {
    private readonly billingRepository: IBillingRepository

    constructor(billingRepository: IBillingRepository) {
        this.billingRepository = billingRepository
    }

    getProfile(userId: string): Promise<CheckoutCustomer | null> {
        return this.billingRepository.findByUserId(userId)
    }

    saveProfile(userId: string, customer: CheckoutCustomer): Promise<CheckoutCustomer> {
        return this.billingRepository.upsert(userId, {
            ...customer,
            country: customer.country.toUpperCase(),
            birthDate: customer.birthDate ?? '',
        })
    }
}
