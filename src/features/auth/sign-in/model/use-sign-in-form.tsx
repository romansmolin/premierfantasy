import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod/v4'

import { authClient } from '@/shared/lib/auth-client'

import { signInFormSchema } from './sign-in.schema'

export const useSignInForm = () => {
    const router = useRouter()
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

        await authClient.signIn.email(
            {
                email,
                password,
                callbackURL: '/dashboard',
            },
            {
                onSuccess: () => {
                    router.push('/dashboard')
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message || 'Invalid email or password. Please try again.')
                },
            },
        )
    }

    return {
        form,
        onSubmit,
    }
}
