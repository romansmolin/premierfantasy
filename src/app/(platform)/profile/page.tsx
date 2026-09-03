import { ProfileView } from '@/views/profile-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Profile',
    description: 'Update your account details, profile image, and preferences, or delete your account.',
}

export default function ProfilePage() {
    return <ProfileView />
}
