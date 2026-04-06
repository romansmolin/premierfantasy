import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod/v4'

import { authClient } from '@/shared/lib/auth-client'

import { signInFormSchema } from './sign-in.schema'

export const useSignInForm = () => {
    const form = useForm<z.infer<typeof signInFormSchema>>({
        resolver: zodResolver(signInFormSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })

    type SignInFormValues = z.infer<typeof signInFormSchema>

    const onSubmit = async (formData: SignInFormValues) => {
        const { email, password } = formData

        const { error } = await authClient.signIn.email({
            email,
            password,
        })

        if (error) {
            toast.error(error.message || 'Invalid email or password. Please try again.')

            return
        }

        window.location.href = '/dashboard'
    }

    return {
        form,
        onSubmit,
    }
}
