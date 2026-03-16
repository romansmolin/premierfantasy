import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod/v4'

import { authClient } from '@/shared/lib/auth-client'

import { signUpFormSchema } from './sign-up.schema'

export const useSignUpForm = () => {
    const [agreeToTerms, setAgreeToTerms] = useState(false)

    const form = useForm<z.infer<typeof signUpFormSchema>>({
        resolver: zodResolver(signUpFormSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    })

    type SignUpFormValues = z.infer<typeof signUpFormSchema>

    const onSubmit = async (formData: SignUpFormValues) => {
        const { username, email, password } = formData

        const { data, error } = await authClient.signUp.email({
            name: username,
            email,
            password,
        })

        if (error) {
            toast.error('Something went wrong! Please try one more time!')
            console.error('Error while signing up: ', error)
        }

        return data
    }

    return {
        form,
        agreeToTerms,
        onSubmit,
        setAgreeToTerms,
    }
}
