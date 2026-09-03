export const SITE = {
    name: 'Premier Fantasy',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    tagline: 'Fantasy Football on Real Premier League Data',
    description:
        'Premier Fantasy is a fantasy football platform built on real Premier League data. Draft a squad, compete in rolling 5-gameweek competitions, climb private leagues, and unlock AI-powered transfer and match insights.',
} as const
