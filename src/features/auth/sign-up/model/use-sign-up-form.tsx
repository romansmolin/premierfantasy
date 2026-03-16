import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'

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

    const onSubmit = async (data: SignUpFormValues) => {
        // TODO: implement sign-up API call
    }

    return {
        form,
        agreeToTerms,
        onSubmit,
        setAgreeToTerms,
    }
}
