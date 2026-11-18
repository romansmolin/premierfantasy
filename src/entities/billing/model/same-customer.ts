import type { CheckoutCustomer } from '@/shared/model/checkout-customer'

const KEYS = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'address',
    'city',
    'country',
    'zip',
    'birthDate',
] as const satisfies readonly (keyof CheckoutCustomer)[]

/** True when two billing forms hold the same values, treating a missing birth date as empty. */
export const sameCustomer = (a: CheckoutCustomer, b: CheckoutCustomer) =>
    KEYS.every((key) => (a[key] ?? '') === (b[key] ?? ''))
