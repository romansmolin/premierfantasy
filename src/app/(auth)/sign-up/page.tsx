import { SignUpView } from '@/views/sign-up-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Create account',
    description:
        'Create a free Premier Fantasy account to draft a squad, join rolling 5-gameweek competitions, and compete in private leagues.',
}

export default function SignUp() {
    return <SignUpView />
}
