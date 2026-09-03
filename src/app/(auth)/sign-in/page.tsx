import { SignInView } from '@/views/sign-in-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Sign in',
    description: 'Sign in to your Premier Fantasy account to manage your squad, transfers, and competitions.',
}

export default function SignIn() {
    return <SignInView />
}
