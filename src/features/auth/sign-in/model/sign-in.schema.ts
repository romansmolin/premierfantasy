import { z } from 'zod/v4'

export const signInFormSchema = z.object({
    email: z.email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
})
