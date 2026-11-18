import type { CheckoutCustomer } from '@/shared/model/checkout-customer'

export interface IBillingRepository {
    findByUserId(userId: string): Promise<CheckoutCustomer | null>
    upsert(userId: string, customer: CheckoutCustomer): Promise<CheckoutCustomer>
}
