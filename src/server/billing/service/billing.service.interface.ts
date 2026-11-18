import type { CheckoutCustomer } from '@/shared/model/checkout-customer'

export interface IBillingService {
    getProfile(userId: string): Promise<CheckoutCustomer | null>
    saveProfile(userId: string, customer: CheckoutCustomer): Promise<CheckoutCustomer>
}
