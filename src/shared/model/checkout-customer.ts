import { z } from 'zod'

const requiredText = (label: string, max = 100) =>
    z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`)

export const checkoutCustomerSchema = z.object({
    firstName: requiredText('First name'),
    lastName: requiredText('Last name'),
    email: z.string().trim().email('Enter a valid email address').max(254),
    phone: requiredText('Phone number', 32).refine(
        (value) => /^[+\d\s().-]+$/.test(value),
        'Enter a valid phone number',
    ),
    address: requiredText('Address', 255),
    city: requiredText('City'),
    country: z
        .string()
        .trim()
        .regex(/^[A-Za-z]{2}$/, 'Enter a two-letter country code'),
    zip: requiredText('Postal code', 32),
    birthDate: z.union([z.literal(''), z.iso.date()]).optional(),
})

export type CheckoutCustomer = z.infer<typeof checkoutCustomerSchema>
