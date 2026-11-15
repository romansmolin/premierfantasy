import { SignUpView } from '@/views/sign-up-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Create account',
    description:
        'Create a free Premier Fantasy account to explore player stats and use AI insights paid with Credits.',
}

export default function SignUp() {
    return <SignUpView />
}
