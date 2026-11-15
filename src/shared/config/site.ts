export const SITE = {
    name: 'Premier Fantasy',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    tagline: 'Advanced Football Stats & AI Squad Assistant',
    description:
        'Premier Fantasy is an analytics tool for fantasy football managers. Explore advanced player and team statistics and use AI-powered insights, paid with Credits, to plan the squad you enter on your favourite fantasy platform. Premier Fantasy does not run fantasy games, contests or prizes.',
} as const
